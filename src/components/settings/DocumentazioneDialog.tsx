import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

/**
 * Come funziona un lancio, scritto dove serve: dentro la pagina che lo mostra.
 * Va tenuto allineato al comportamento reale — se una regola cambia, cambia anche qui.
 */

const SEZIONI = [
  { k: "config", t: "Configurare un lancio" },
  { k: "assegna", t: "Come viene assegnato un lead" },
  { k: "quote", t: "Quote, tetti e pause" },
  { k: "coda", t: "Coda, lead liberi e recupero" },
  { k: "esterni", t: "Lead che arrivano già assegnati (link UTM)" },
  { k: "whatsapp", t: "Link WhatsApp" },
  { k: "numeri", t: "Da dove vengono i numeri" },
];

const T = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>
);
const H = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[12.5px] font-semibold mt-3 mb-1">{children}</h4>
);
const K = ({ children }: { children: React.ReactNode }) => (
  <b className="text-foreground/85 font-medium">{children}</b>
);
const Nota = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-amber-500/35 bg-amber-500/5 px-2.5 py-2 text-[12px] text-muted-foreground my-2">
    {children}
  </div>
);

const DocumentazioneDialog = () => {
  const [open, setOpen] = useState(false);
  const [sez, setSez] = useState("config");

  return (
    <>
      <Button size="sm" variant="outline" className="h-8" onClick={() => setOpen(true)} title="Come funziona un lancio">
        <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Documentazione</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[88vh] overflow-hidden flex flex-col top-[6vh] translate-y-0">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Come funziona un lancio</DialogTitle>
          </DialogHeader>

          <div className="-mx-1 px-1 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex gap-1 w-max pb-1">
              {SEZIONI.map((s) => (
                <button key={s.k} type="button" onClick={() => setSez(s.k)}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] whitespace-nowrap transition-colors ${
                    sez === s.k ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary"}`}>
                  {s.t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto pr-1">
            {sez === "config" && (
              <div>
                <T>
                  Un lancio si configura in <K>Impostazioni → Lanci</K>, non da questa pagina: qui i dati si
                  guardano soltanto. Il wizard ha cinque passi, apribili in qualsiasi ordine.
                </T>
                <H>Lancio</H>
                <T>Nome e identificativo. Il nome compare nel selettore in alto.</T>
                <H>Venditori</H>
                <T>
                  Chi lavora ai lead del lancio. La scelta vale per tutto: quali fogli vengono letti, chi compare
                  nella matrice, chi può ricevere lead. Se non scegli nessuno vengono presi tutti gli attivi del
                  market, il che rallenta la lettura e sporca i totali con chi al lancio non lavora.
                </T>
                <H>Dati</H>
                <T>
                  <K>Tab lead</K>: il foglio dove i venditori tengono i lead del lancio, uguale per tutti.
                  <K> Tab call</K>: i fogli mensili delle call. <K>Provenienza</K>: il valore in colonna B che
                  distingue le call di questo lancio dalle altre. <K>Campagna</K>: il valore scritto sul lead nel
                  database, con cui si contano lead generati, fonti e andamento.
                </T>
                <Nota>
                  La provenienza deve essere scritta <K>esattamente</K> come compare nei fogli. Se lì c'è
                  <K> 3Sfere</K> e qui scrivi <K>3sfere</K> la matrice resta a zero senza dare errore. Il pulsante
                  con la beuta in Impostazioni → Lanci verifica questo e altro senza scrivere niente.
                </Nota>
                <H>Assegnazione</H>
                <T>
                  La regola che smista i lead. È la stessa che vedi in <K>Impostazioni → Automazioni</K>: puoi
                  lavorarci da entrambe le parti, non sono due cose diverse.
                </T>
                <H>WhatsApp</H>
                <T>Il link che porta il lead sulla chat del venditore che gli è stato assegnato.</T>
              </div>
            )}

            {sez === "assegna" && (
              <div>
                <T>
                  Quando entra un lead, le regole attive vengono provate <K>in ordine di priorità</K> e ci si ferma
                  alla prima che lo prende. Dentro una regola l'ordine è questo:
                </T>
                <H>1. Il lead è già noto?</H>
                <T>
                  Se <K>«cerca prima il venditore precedente»</K> è attivo, si cerca per email o telefono l'ultimo
                  lead assegnato a una persona vera. Se l'ultima assegnazione rientra nel periodo impostato — il
                  <K> lock period</K> — il lead torna a quel venditore. Questo passaggio <K>ignora tetti e pause</K>:
                  chi ha già parlato con qualcuno continua ad andare da lui, e il suo contatore sale lo stesso.
                </T>
                <T>
                  Il periodo si misura sulla <K>data di assegnazione</K> del lead precedente. Con 60 giorni: a 59
                  torna al venditore, a 60 viene ridistribuito. «Sempre» toglie la scadenza.
                </T>
                <T>
                  Di suo la ricerca guarda <K>tutti</K> i venditori attivi del market, non solo quelli del lancio:
                  un lead già lavorato da un setter che a questo lancio non partecipa tornerebbe comunque a lui, e i
                  suoi numeri non comparirebbero nella matrice perché non ha i tab del lancio. L'opzione
                  <K> «solo se il venditore precedente è in questo lancio»</K> lo impedisce e lo fa ridistribuire.
                </T>
                <H>2. Altrimenti, la distribuzione</H>
                <T>
                  Il lead va a uno dei venditori del lancio, scelto a caso con probabilità proporzionale alla sua
                  percentuale, fra quelli che possono ancora riceverne.
                </T>
                <H>3. Se non può riceverlo nessuno</H>
                <T>
                  Il lead <K>resta libero</K>: nessun venditore, stato «nuovo», assegnabile. Resta cioè visibile fra
                  i lead da lavorare, in attesa che qualcuno alzi i limiti o lo assegni a mano.
                </T>
                <H>Condizioni ed esclusioni</H>
                <T>
                  La condizione guarda la fonte del lead: <K>contiene</K> o <K>non contiene</K> uno dei valori,
                  separati da virgola, basta che ne corrisponda uno. Le esclusioni («…ma non se contiene») hanno la
                  meglio: se scattano, la regola non si applica anche quando la condizione è soddisfatta.
                </T>
              </div>
            )}

            {sez === "quote" && (
              <div>
                <H>Percentuale</H>
                <T>
                  Ogni venditore ha una quota. Le quote devono sommare a 100. «Dividi equamente» le assegna in parti
                  uguali distribuendo il resto, così lo scarto fra due venditori non supera mai un punto.
                </T>
                <H>Quota assoluta</H>
                <T>
                  Invece della percentuale si imposta un numero di lead. Attenzione a come si riempiono: finché sono
                  tutte aperte, le quote ricevono <K>in parti uguali</K>, non in proporzione alla loro dimensione.
                  Chi ha 20 la riempie subito e poi si ferma, chi ha 200 continua a lungo. Il totale finale rispetta
                  le quote, il ritmo no.
                </T>
                <H>Tetto massimo</H>
                <T>
                  Vale in modalità percentuale: oltre quel numero il venditore viene saltato e i suoi lead vanno agli
                  altri, che se li dividono <K>mantenendo le proporzioni fra loro</K>. Lasciarlo vuoto significa
                  nessun limite.
                </T>
                <H>Gruppi: dare più lead ai closer che ai setter</H>
                <T>
                  Ogni venditore può stare in un gruppo, e ogni gruppo ha una <K>quota sul totale dei lead</K>.
                  Closer 60 e setter 40 significa che <K>ogni dieci lead sei vanno ai closer e quattro ai setter</K>,
                  indipendentemente da quante persone ci sono nei due gruppi.
                </T>
                <T>
                  La scelta avviene a due livelli: prima si sorteggia il gruppo con la sua quota, poi la persona
                  dentro il gruppo con la percentuale della tabella. Quindi le percentuali individuali si sommano a
                  100 <K>dentro il gruppo</K>, e le quote dei gruppi si sommano a 100 fra loro.
                </T>
                <T>
                  Se un gruppo non ha nessuno disponibile — tetti pieni o tutti in pausa — la sua quota si
                  ridistribuisce sugli altri invece di bloccare i lead. Senza gruppi tutto funziona come prima, con
                  le sole percentuali individuali.
                </T>
                <Nota>
                  Le percentuali si vedono sui numeri grandi. Su venti o trenta lead lo scarto dal 60/40 è normale,
                  esattamente come lanciando una moneta poche volte: il meccanismo è stato verificato su centomila
                  estrazioni e dà 60,0% e 40,0%.
                </Nota>
                <H>Pausa</H>
                <T>
                  Il tasto a sinistra del nome ferma un singolo venditore. La sua percentuale <K>resta salvata</K>:
                  quando lo riattivi ritrova la quota di prima. Un lead che aveva già parlato con lui continua però
                  ad arrivargli, ed è contato: la pausa ferma i lead nuovi, non le riassegnazioni.
                </T>
                <H>Governare senza entrare nelle impostazioni</H>
                <T>
                  Le leve che servono a lancio partito stanno anche in <K>Lanci → Distribuzione</K>: pausa di un
                  venditore, percentuali, tetti, azzeramento dei contatori e sospensione delle assegnazioni. Da lì
                  non si toccano condizioni, fogli, campagne o webhook, che restano in Impostazioni: è il posto
                  giusto per chi governa il flusso ogni giorno senza dover aprire la configurazione del lancio.
                </T>
                <H>Contatori</H>
                <T>
                  Ogni assegnazione a un venditore della distribuzione scala il suo tetto, da qualunque strada arrivi:
                  distribuzione, venditore precedente, recupero, riassegnazione manuale o lead che entra già
                  assegnato. Riassegnando a mano un lead da uno all'altro, chi cede scende e chi prende sale.
                </T>
                <T>
                  Nella tabella delle quote il numero in mezzo sono i lead già assegnati: cliccandolo si azzera quel
                  venditore, col pulsante sopra si azzerano tutti.
                </T>
              </div>
            )}

            {sez === "coda" && (
              <div>
                <H>I tre stati dell'assegnazione</H>
                <T>
                  In <K>Lanci → Distribuzione</K> la regola ha tre stati che si escludono a vicenda.
                  <br /><K>Attiva</K>: i lead vengono distribuiti secondo le percentuali, e chi era già stato
                  assegnato di recente torna al suo venditore.
                  <br /><K>Solo ritorni</K>: i lead nuovi entrano come assegnati a «Round Robin» e restano in
                  attesa; passa solo chi era già stato assegnato entro il periodo impostato.
                  <br /><K>Spenta</K>: non viene assegnato niente, nemmeno i ritorni. I lead restano
                  <K> liberi</K> — senza venditore, assegnabili — e compaiono fra quelli da smistare a mano.
                  Niente scritture sui fogli e niente webhook.
                </T>
                <Nota>
                  I lead che arrivano già con un venditore, cioè quelli dei link personali con UTM, non passano
                  da nessuno dei tre stati: le automazioni vengono saltate a monte, quindi continuano ad
                  arrivare ai venditori anche a regola spenta.
                </Nota>
                <H>Sospensione temporanea</H>
                <T>
                  L'interruttore rosso in fondo alla scheda Assegnazione. Da usare a lancio partito, quando i
                  venditori sono indietro con la lavorazione: i lead nuovi <K>non vengono distribuiti</K> ed entrano
                  come assegnati al venditore «Round Robin», che non è una persona ma la coda d'attesa. Passa solo
                  chi era già stato assegnato entro il lock period, che torna al suo venditore.
                </T>
                <T>
                  Percentuali, tetti e contatori restano dove sono: spegnendola l'assegnazione riprende da dov'era.
                </T>
                <H>Coda e lead liberi: non sono la stessa cosa</H>
                <T>
                  In <K>coda</K> finisce solo chi hai deciso tu di parcheggiare con la sospensione. Chi invece non
                  trova posto perché i tetti sono pieni <K>resta libero</K>, senza venditore: continua a comparire fra
                  i lead da lavorare invece di sembrare già sistemato.
                </T>
                <H>Rimetterli in circolo</H>
                <T>
                  Se ci sono lead in coda <K>di questo lancio</K>, nel blocco rosso compare il conteggio e il pulsante
                  per distribuirli. Ripassano dalle automazioni come lead in ingresso, quindi rispettano venditore
                  precedente, tetti, pause e contatori. Il pulsante è spento finché la sospensione è accesa,
                  altrimenti tornerebbero in coda all'istante.
                </T>
                <T>
                  Per i lead rimasti liberi il tool te lo propone da solo: alzando i tetti e salvando, se ce ne sono,
                  compare una finestra che dice quanti sono, quanti ne rientrerebbero e come verrebbero ripartiti.
                </T>
              </div>
            )}

            {sez === "esterni" && (
              <div>
                <T>
                  Molti venditori e setter usano link personali con UTM: chi si iscrive da lì finisce in database
                  <K> già intestato a loro</K>. Non c'è conflitto con le automazioni.
                </T>
                <H>Cosa succede</H>
                <T>
                  Se il lead arriva con il venditore già valorizzato, le automazioni <K>vengono saltate</K>: nessuna
                  regola glielo porta via, resta di chi l'ha generato.
                </T>
                <H>Il tetto viene scalato lo stesso</H>
                <T>
                  Quel lead occupa capacità della persona, quindi scala dal suo tetto: viene attribuito alla regola
                  che lo avrebbe gestito, cioè quella che distribuisce a quel venditore e la cui condizione
                  corrisponde alla fonte del lead. Nello storico compare come <K>counted_preassigned</K>, distinto da
                  un'assegnazione vera.
                </T>
                <Nota>
                  Se l'UTM produce una fonte che <K>non contiene</K> la stringa della condizione, il lead viene
                  assegnato ma <K>non scala niente</K>: nessuna regola lo riconosce. Tieni la stringa del lancio
                  dentro la fonte del link.
                </Nota>
                <H>Due trappole</H>
                <T>
                  Se chi inserisce il lead passa <K>assignable = true</K> insieme al venditore, le automazioni partono
                  lo stesso e possono sovrascrivere quell'assegnazione. E se il lead viene scritto direttamente in
                  tabella invece che dal webhook, non parte niente: né regole né contatori. L'assegnazione resta
                  valida e viene ereditata, perché se lo stesso lead rientra viene ritrovato per email o telefono.
                </T>
              </div>
            )}

            {sez === "whatsapp" && (
              <div>
                <T>
                  Il link porta il lead sulla chat del venditore <K>che gli è stato assegnato</K>: cerca il lead per
                  email o telefono, legge chi ce l'ha in carico e apre WhatsApp col suo numero e col messaggio del
                  template.
                </T>
                <H>Servono i parametri</H>
                <T>
                  Il link ha bisogno di <K>email oppure telefono</K> per capire di quale lead si tratta. Senza, non
                  può sapere quale venditore aprire. Il nome è facoltativo e serve solo al messaggio.
                </T>
                <H>Due link sullo stesso lancio (prova A/B)</H>
                <T>
                  Un lancio può avere più link collegati: due pulsanti su pagine diverse si contano
                  separatamente e nel tab WhatsApp compare il confronto — click, quota sul totale, quanti sono
                  davvero arrivati in chat e quanti hanno dato errore. Le schede in cima sommano tutti i link.
                </T>
                <H>Il numero di riserva</H>
                <T>
                  Se il lead non ha ancora un venditore, il template può avere un numero di riserva: senza, il lead
                  vede una pagina di errore. Vale la pena impostarlo sempre.
                </T>
                <H>Chi clicca troppo presto</H>
                <T>
                  Fra l'ingresso del lead e l'assegnazione passa qualche istante. La pagina lo sa e riprova per nove
                  secondi prima di arrendersi al numero di riserva.
                </T>
                <H>Lead storico nel webhook</H>
                <T>
                  Quando un lead torna al suo venditore perché rientra nell'intervallo, il webhook lo dichiara:
                  <K> lead_storico</K>, <K>venditore_precedente</K>, <K>prima_assegnazione</K>,
                  <K> giorni_da_ultima_assegnazione</K> e <K>intervallo_giorni</K>. Chi riceve il webhook può così
                  trattarlo diversamente da un contatto nuovo senza doversi ricostruire lo storico.
                </T>
                <H>Il nome che legge il lead</H>
                <T>
                  Nel messaggio e sulla pagina il ruolo attaccato al nome in anagrafica viene tolto: «Nicola Feliciolli
                  Setter» diventa <K>Nicola Feliciolli</K>. Il lead non deve leggere l'organigramma.
                </T>
              </div>
            )}

            {sez === "numeri" && (
              <div>
                <T>I numeri arrivano da due posti diversi, ed è la cosa più importante da sapere per leggerli.</T>
                <H>Dal database</H>
                <T>
                  <K>Lead generati</K>, mix per fonte, andamento giornaliero e speed to lead: contati sui lead che
                  hanno la <K>campagna</K> del lancio. Se la campagna non viene scritta sul lead, questi restano a zero
                  anche se i lead stanno arrivando.
                </T>
                <H>Dai fogli dei venditori</H>
                <T>
                  <K>Assegnati</K>, qualifiche, voti, call, chiusure e fatturato: letti dal tab lead e dai tab call di
                  ciascun venditore. Se un lead non finisce nel tab del lancio, per la matrice non esiste.
                </T>
                <H>Definizioni che non sono ovvie</H>
                <T>
                  <K>Call da fare</K>: entrate con quella provenienza ma non ancora svolte — esito vuoto, oppure
                  «Prenotato Closing» e «Closing Confermato», che sono call fissate ma non fatte.<br />
                  <K>Call nette</K>: totali meno le da fare, meno rischedulate, no show e cancellate.<br />
                  <K>Tasso di chiusura</K>: chiusure sulle call nette. Le chiusure sono gli esiti «Pagamento unico»,
                  «Pagamento a rate» e «Acconto».
                </T>
                <H>Aggiornamento</H>
                <T>
                  La lettura dei fogli è lenta, quindi il risultato viene tenuto in cache: fresco per quindici minuti,
                  servito fino a dodici ore mentre si ricalcola dietro. La pagina si aggiorna da sola ogni cinque
                  minuti quando è in primo piano. Sopra i venti minuti compare una fascia che lo dice, col pulsante per
                  ricalcolare subito. L'età è quella del <K>calcolo</K>, non del momento in cui il browser ha ricevuto
                  la risposta.
                </T>
                <Nota>
                  Se una fascia rossa dice <K>«numeri incompleti»</K>, un foglio non è stato letto e quel venditore
                  manca dai totali: non è un dettaglio, i totali sono sbagliati finché non riprovi.
                </Nota>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentazioneDialog;
