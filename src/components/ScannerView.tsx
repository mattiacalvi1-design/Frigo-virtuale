import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Barcode,
  Camera,
  Check,
  Loader2,
  Plus,
  Receipt,
  ScanLine,
  StopCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import { SAMPLE_BARCODES, SAMPLE_RECEIPT_TEXT } from '../data/seedData';
import { FridgeItem, FridgeShelf, ScannedDraftItem } from '../types/fridge';
import {
  SHELF_META,
  addDaysToDateString,
  getTodayDateString,
  parseReceiptTextLines,
} from '../utils/fridgeLogic';

interface ScannerViewProps {
  onCommitItems: (items: Omit<FridgeItem, 'id' | 'addedAt'>[]) => void;
}

type ScanTab = 'fotocamera' | 'scontrino' | 'codice';

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
}

export function ScannerView({ onCommitItems }: ScannerViewProps) {
  const todayStr = getTodayDateString();
  const [scanTab, setScanTab] = useState<ScanTab>('fotocamera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [receiptText, setReceiptText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState('');
  const [draftItems, setDraftItems] = useState<ScannedDraftItem[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Continuous native BarcodeDetector polling when camera is running
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const win = window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
    };
    if (!win.BarcodeDetector) return;

    const detector = new win.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
    });

    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        return;
      }
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0 && codes[0].rawValue) {
          const value = codes[0].rawValue;
          setDetectedCode(value);
          setBarcodeInput(value);
        }
      } catch {
        // Ignore transient frame decode issues
      }
    }, 650);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cameraActive]);

  function stopCameraStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError('');
    setScanError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Fotocamera non disponibile in questo browser. Carica una foto oppure inserisci il codice o lo scontrino.',
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        'Accesso alla fotocamera non concesso o non disponibile. Puoi caricare una foto dello scontrino o usare i dati di esempio qui sotto.',
      );
    }
  }

  async function captureCameraFrameAndAnalyze() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setPreviewUrl(dataUrl);
    await analyzeWithServer({
      imageBase64: dataUrl,
      mimeType: 'image/jpeg',
      barcode: detectedCode || undefined,
    });
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? '');
      setPreviewUrl(dataUrl);
      await analyzeWithServer({
        imageBase64: dataUrl,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  }

  async function analyzeWithServer(payload: {
    imageBase64?: string;
    mimeType?: string;
    barcode?: string;
    receiptText?: string;
  }) {
    setIsAnalyzing(true);
    setScanError('');
    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile completare la scansione AI.');
      }

      const validShelves = new Set<FridgeShelf>([
        'latticini',
        'verdura',
        'carne_pesce',
        'pasta_sughi',
        'bevande_altro',
      ]);

      const normalized: ScannedDraftItem[] = (data.items || []).map(
        (
          item: {
            name: string;
            quantity?: number;
            unit?: string;
            shelf?: string;
            estimatedDays?: number;
            barcode?: string;
          },
          idx: number,
        ) => {
          const days = Math.max(1, Number(item.estimatedDays) || 4);
          const shelf: FridgeShelf = validShelves.has(item.shelf as FridgeShelf)
            ? (item.shelf as FridgeShelf)
            : 'bevande_altro';
          return {
            tempId: `ai-${Date.now()}-${idx}`,
            name: item.name,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit: item.unit || 'conf.',
            shelf,
            estimatedDays: days,
            expiryDate: addDaysToDateString(todayStr, days),
            barcode: item.barcode || payload.barcode || undefined,
          };
        },
      );

      if (normalized.length === 0) {
        setScanError(
          'Nessun alimento rilevato. Prova con una foto più nitida o inserisci il testo dello scontrino.',
        );
      } else {
        setDraftItems((prev) => [...prev, ...normalized]);
      }
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : 'Errore durante l’analisi dello scontrino.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleLoadSampleReceipt() {
    setScanTab('scontrino');
    setReceiptText(SAMPLE_RECEIPT_TEXT);
    const parsed = parseReceiptTextLines(SAMPLE_RECEIPT_TEXT, todayStr);
    setDraftItems(parsed);
    setScanError('');
  }

  function handleParseManualReceipt(e: FormEvent) {
    e.preventDefault();
    setScanError('');
    if (!receiptText.trim()) {
      setScanError('Incolla le righe dello scontrino prima di procedere.');
      return;
    }
    const parsed = parseReceiptTextLines(receiptText, todayStr);
    if (parsed.length === 0) {
      setScanError('Nessuna riga alimentare riconosciuta nel testo.');
      return;
    }
    setDraftItems((prev) => [...prev, ...parsed]);
  }

  async function handleBarcodeLookup(e: FormEvent) {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) {
      setScanError('Inserisci un codice a barre EAN da cercare.');
      return;
    }
    const known = SAMPLE_BARCODES.find((b) => b.code === code);
    if (known) {
      const parsed = parseReceiptTextLines(`${known.code} ${known.label}`, todayStr);
      setDraftItems((prev) => [...prev, ...parsed]);
      setBarcodeInput('');
      setScanError('');
      return;
    }
    await analyzeWithServer({ barcode: code });
  }

  function updateDraftItem(
    tempId: string,
    patch: Partial<ScannedDraftItem>,
  ) {
    setDraftItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)),
    );
  }

  function removeDraftItem(tempId: string) {
    setDraftItems((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  function handleConfirmToFridge() {
    if (draftItems.length === 0) return;
    onCommitItems(
      draftItems.map((d) => ({
        name: d.name.trim(),
        quantity: Math.max(1, d.quantity),
        unit: d.unit.trim() || 'conf.',
        shelf: d.shelf,
        expiryDate: d.expiryDate,
        barcode: d.barcode,
      })),
    );
    setDraftItems([]);
    setPreviewUrl(null);
    setReceiptText('');
    stopCameraStream();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-amber-700">
            Lettura scontrini e codici a barre
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900">
            Scansiona la spesa
          </h1>
          <p className="text-sm text-stone-600 max-w-2xl">
            Inquadra il codice a barre o fotografa il tuo scontrino: estraiamo i
            prodotti, assegniamo i ripiani del frigorifero e calcoliamo le scadenze
            stimate.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleReceipt}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Receipt className="h-4 w-4 text-amber-700" aria-hidden="true" />
          <span>Prova scontrino di esempio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonna sinistra: Acquisizione */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-5">
          <div
            role="tablist"
            aria-label="Modalità di scansione"
            className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1"
          >
            {(
              [
                { id: 'fotocamera', label: 'Fotocamera', icon: Camera },
                { id: 'scontrino', label: 'Foto / Testo', icon: Receipt },
                { id: 'codice', label: 'Codice EAN', icon: Barcode },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={scanTab === tab.id}
                  type="button"
                  onClick={() => setScanTab(tab.id)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    scanTab === tab.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {scanTab === 'fotocamera' && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-900 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Anteprima scontrino o codice a barre catturato"
                    className="h-full w-full object-contain"
                  />
                )}
                {!cameraActive && !previewUrl && (
                  <div className="px-6 text-center space-y-3 text-stone-300">
                    <ScanLine
                      className="mx-auto h-10 w-10 text-amber-400"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-white">
                      Inquadra il codice a barre o lo scontrino
                    </p>
                    <p className="text-xs text-stone-400">
                      Attiva la fotocamera oppure carica una foto dallo smartphone.
                    </p>
                  </div>
                )}

                {cameraActive && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-amber-400/80"
                  />
                )}
              </div>

              {detectedCode && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs">
                  <span className="font-medium text-emerald-900">
                    Codice rilevato: <strong className="font-mono">{detectedCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => analyzeWithServer({ barcode: detectedCode })}
                    className="font-semibold text-emerald-800 underline cursor-pointer"
                  >
                    Cerca prodotto
                  </button>
                </div>
              )}

              {cameraError && (
                <p role="alert" className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {cameraError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    <span>Attiva fotocamera</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureCameraFrameAndAnalyze}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                    >
                      <ScanLine className="h-4 w-4" aria-hidden="true" />
                      <span>Scatta e riconosci prodotti</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <StopCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Ferma</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Carica foto scontrino</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {scanTab === 'scontrino' && (
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-stone-300 bg-[#FAF9F6] p-5 text-center hover:border-amber-600 transition-colors cursor-pointer"
                >
                  <Upload className="mx-auto h-6 w-6 text-amber-700" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    Carica immagine scontrino o codice a barre
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    JPG, PNG o WebP · Riconoscimento automatico alimenti e scadenze
                  </p>
                </button>
              </div>

              <form onSubmit={handleParseManualReceipt} className="space-y-3">
                <label
                  htmlFor="receipt-textarea"
                  className="block text-xs font-semibold text-stone-700"
                >
                  Oppure incolla le righe dello scontrino digitale
                </label>
                <textarea
                  id="receipt-textarea"
                  rows={6}
                  value={receiptText}
                  onChange={(e) => setReceiptText(e.target.value)}
                  placeholder={`8004567001234 MOZZARELLA DI BUFALA 250G  3,29\n2x YOGURT GRECO NATURALE  2,40`}
                  className="w-full rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Estrai righe scontrino</span>
                  </button>
                  <button
                    type="button"
                    disabled={!receiptText.trim() || isAnalyzing}
                    onClick={() => analyzeWithServer({ receiptText })}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
                  >
                    <span>Analizza con AI</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {scanTab === 'codice' && (
            <div className="space-y-4">
              <form onSubmit={handleBarcodeLookup} className="space-y-3">
                <label
                  htmlFor="barcode-manual-input"
                  className="block text-xs font-semibold text-stone-700"
                >
                  Codice a barre (EAN-13 / EAN-8)
                </label>
                <div className="flex gap-2">
                  <input
                    id="barcode-manual-input"
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Es. 8004567001234"
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm tabular-nums text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    Aggiungi codice
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-2 border-t border-stone-200">
                <p className="text-xs font-semibold text-stone-500">
                  Codici rapidi di prova
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_BARCODES.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => {
                        const parsed = parseReceiptTextLines(
                          `${b.code} ${b.label}`,
                          todayStr,
                        );
                        setDraftItems((prev) => [...prev, ...parsed]);
                      }}
                      className="flex flex-col items-start rounded-lg border border-stone-200 bg-[#FAF9F6] px-3 py-2 text-left hover:border-amber-500 cursor-pointer"
                    >
                      <span className="font-mono text-xs text-stone-500 tabular-nums">
                        {b.code}
                      </span>
                      <span className="text-xs font-semibold text-stone-900">
                        {b.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Analisi prodotti e stima delle scadenze in corso...</span>
            </div>
          )}

          {scanError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              {scanError}
            </p>
          )}
        </section>

        {/* Colonna destra: Prodotti rilevati pronti da confermare */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">
                Prodotti pronti per il frigo
              </h2>
              <p className="text-xs text-stone-500 tabular-nums">
                {draftItems.length}{' '}
                {draftItems.length === 1 ? 'alimento rilevato' : 'alimenti rilevati'} ·
                Puoi correggere ripiano e scadenza prima di salvare
              </p>
            </div>
            {draftItems.length > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDraftItems([])}
                  className="text-xs font-medium text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Svuota
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToFridge}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Salva ({draftItems.length})</span>
                </button>
              </div>
            )}
          </div>

          {draftItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-[#FAF9F6] p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-stone-800">
                Nessun prodotto ancora in coda
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Scatta una foto con la fotocamera, carica uno scontrino o premi
                &ldquo;Prova scontrino di esempio&rdquo; per vedere i prodotti comparire
                qui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {draftItems.map((draft) => (
                <div
                  key={draft.tempId}
                  data-testid="scanned-draft-item"
                  className="rounded-xl border border-stone-200 bg-[#FAF9F6] p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label="Nome prodotto rilevato"
                      value={draft.name}
                      onChange={(e) =>
                        updateDraftItem(draft.tempId, { name: e.target.value })
                      }
                      className="flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-stone-900 focus:border-amber-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftItem(draft.tempId)}
                      aria-label={`Rimuovi ${draft.name} dalla coda`}
                      className="rounded-md p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-900 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        aria-label={`Quantità per ${draft.name}`}
                        value={draft.quantity}
                        onChange={(e) =>
                          updateDraftItem(draft.tempId, {
                            quantity: Math.max(1, parseInt(e.target.value || '1', 10)),
                          })
                        }
                        className="w-16 rounded-md border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs tabular-nums text-stone-900"
                      />
                      <input
                        type="text"
                        aria-label={`Unità per ${draft.name}`}
                        value={draft.unit}
                        onChange={(e) =>
                          updateDraftItem(draft.tempId, { unit: e.target.value })
                        }
                        className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900"
                      />
                    </div>

                    <select
                      aria-label={`Ripiano per ${draft.name}`}
                      value={draft.shelf}
                      onChange={(e) =>
                        updateDraftItem(draft.tempId, {
                          shelf: e.target.value as FridgeShelf,
                        })
                      }
                      className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900"
                    >
                      {(Object.keys(SHELF_META) as FridgeShelf[]).map((s) => (
                        <option key={s} value={s}>
                          {SHELF_META[s].label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      aria-label={`Scadenza stimata per ${draft.name}`}
                      value={draft.expiryDate}
                      onChange={(e) =>
                        updateDraftItem(draft.tempId, { expiryDate: e.target.value })
                      }
                      className="rounded-md border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs tabular-nums text-stone-900"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleConfirmToFridge}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>
                  Aggiungi {draftItems.length}{' '}
                  {draftItems.length === 1 ? 'prodotto' : 'prodotti'} al Frigorifero
                </span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
