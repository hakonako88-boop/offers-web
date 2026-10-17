const labels: Record<string, string> = {
  Amazon: "amazon", AliExpress: "AliExpress", Miravia: "miravia", Xiaomi: "mi",
  PcComponentes: "pccomponentes", MediaMarkt: "MediaMarkt", "El Corte Inglés": "El Corte Inglés",
};

export default function StoreLogo({ store }: { store: string }) {
  return <span className="merchantLogo" data-merchant={store} aria-label={`Tienda ${store}`}>
    <span aria-hidden="true">{labels[store] || store}</span>
  </span>;
}
