const logos: Record<string, { src: string; showName?: boolean }> = {
  Amazon: { src: "/store-logos/amazon.svg" },
  AliExpress: { src: "/store-logos/aliexpress.svg" },
  Miravia: { src: "/store-logos/miravia.png", showName: true },
  Xiaomi: { src: "/store-logos/xiaomi.png", showName: true },
  PcComponentes: { src: "/store-logos/pccomponentes.png", showName: true },
  MediaMarkt: { src: "/store-logos/mediamarkt.svg" },
  "El Corte Inglés": { src: "/store-logos/el-corte-ingles.svg", showName: true },
};

export default function StoreLogo({ store }: { store: string }) {
  const logo = logos[store];
  return <span className="merchantLogo" data-merchant={store} aria-label={`Tienda ${store}`}>
    {logo ? <img src={logo.src} alt="" width={96} height={32} loading="lazy" decoding="async" /> : null}
    {(!logo || logo.showName) && <span className="merchantName" aria-hidden="true">{store}</span>}
  </span>;
}
