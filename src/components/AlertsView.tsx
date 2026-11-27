import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ExpiryAlert } from '../types/fridge';
import { SHELF_META, formatExpiryLabel } from '../utils/fridgeLogic';

interface AlertsViewProps {
  alerts: ExpiryAlert[];
  warningDays: number;
  onChangeWarningDays: (days: number) => void;
  onRemoveItem: (id: string) => void;
  onGoToRecipes: () => void;
}

export function AlertsView({
  alerts,
  warningDays,
  onChangeWarningDays,
  onRemoveItem,
  onGoToRecipes,
}: AlertsViewProps) {
  const supportsPush = typeof window !== 'undefined' && 'Notification' in window;
  const [permissionState, setPermissionState] = useState<string>(
    supportsPush ? Notification.permission : 'unsupported',
  );
  const [pushFeedback, setPushFeedback] = useState('');

  async function handleEnableNotifications() {
    if (!supportsPush) {
      setPushFeedback('Le notifiche push non sono supportate in questo browser.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === 'granted') {
      sendSummaryNotification();
    } else {
      setPushFeedback(
        'Permesso non concesso. Gli avvisi restano comunque visibili qui in app.',
      );
    }
  }

  function sendSummaryNotification() {
    if (!supportsPush || Notification.permission !== 'granted') {
      setPushFeedback('Attiva prima il permesso alle notifiche del browser.');
      return;
    }
    const topAlert = alerts[0];
    const body = topAlert
      ? `${alerts.length} alimenti richiedono attenzione: ${topAlert.item.name} (${formatExpiryLabel(topAlert.daysLeft)}).`
      : 'Nessun alimento in scadenza imminente nel tuo frigorifero.';

    new Notification('FrigoVivo · Avviso Scadenze', {
      body,
    });
    setPushFeedback('Notifica di riepilogo inviata.');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-amber-700">
            Monitoraggio freschezza
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900">
            Avvisi e Notifiche Scadenze
          </h1>
          <p className="text-sm text-stone-600">
            Controlla gli alimenti da consumare subito e imposta con quanti giorni di
            anticipo ricevere l’avviso.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToRecipes}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ChefHat className="h-4 w-4" aria-hidden="true" />
          <span>Vedi ricette salva-spreco</span>
        </button>
      </div>

      {/* Impostazioni notifiche */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-stone-900">
              Preferenze di preavviso
            </h2>
            <p className="text-xs text-stone-500">
              Scegli quando segnalare un alimento come &ldquo;In scadenza&rdquo;.
            </p>
          </div>

          <div
            role="group"
            aria-label="Giorni di anticipo avvisi"
            className="inline-flex items-center gap-1 rounded-lg bg-stone-100 p-1"
          >
            {[1, 2, 3, 5, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChangeWarningDays(days)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap cursor-pointer ${
                  warningDays === days
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {days}g
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-stone-200 pt-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-stone-900">
                Notifiche push del browser
              </p>
              <p className="text-xs text-stone-500">
                Stato attuale:{' '}
                {permissionState === 'granted'
                  ? 'Attive'
                  : permissionState === 'denied'
                    ? 'Bloccate dal browser'
                    : permissionState === 'unsupported'
                      ? 'Non supportate'
                      : 'Da autorizzare'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissionState !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer"
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Attiva notifiche</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={sendSummaryNotification}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer"
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Invia notifica di prova</span>
              </button>
            )}
          </div>
        </div>

        {pushFeedback && (
          <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2">
            {pushFeedback}
          </p>
        )}
      </section>

      {/* Lista avvisi */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-stone-900">
            Alimenti che richiedono attenzione
          </h2>
          <span className="text-xs font-mono text-stone-500 tabular-nums">
            {alerts.length} {alerts.length === 1 ? 'avviso' : 'avvisi'}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center space-y-2">
            <CheckCircle2
              className="mx-auto h-8 w-8 text-emerald-700"
              aria-hidden="true"
            />
            <h3 className="font-display text-lg font-semibold text-stone-900">
              Tutto fresco nel frigorifero
            </h3>
            <p className="text-sm text-stone-600">
              Nessun prodotto è scaduto o in scadenza entro i prossimi {warningDays}{' '}
              giorni.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-200">
            {alerts.map((alert) => {
              const Icon =
                alert.status === 'expired'
                  ? XCircle
                  : alert.status === 'urgent'
                    ? AlertTriangle
                    : Clock;
              const tone =
                alert.status === 'expired'
                  ? 'text-red-700'
                  : 'text-amber-700';

              return (
                <div
                  key={alert.id}
                  data-testid="expiry-alert-row"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`h-5 w-5 mt-0.5 shrink-0 ${tone}`}
                      aria-hidden="true"
                    />
                    <div className="space-y-1">
                      <p className="font-semibold text-stone-900">
                        {alert.title}
                      </p>
                      <p className="text-xs text-stone-600 tabular-nums">
                        {alert.message} · Scadenza {alert.item.expiryDate} ·{' '}
                        {alert.item.quantity} {alert.item.unit} ·{' '}
                        {SHELF_META[alert.item.shelf].label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onGoToRecipes}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 whitespace-nowrap cursor-pointer"
                    >
                      Trova ricetta
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(alert.item.id)}
                      aria-label={`Rimuovi ${alert.item.name} dal frigo`}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Elimina</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
