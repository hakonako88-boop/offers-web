const clientPattern = /^ca-pub-\d+$/;
const slotPattern = /^\d+$/;

function validValue(value: string | undefined, pattern: RegExp) {
  const candidate = value?.trim() ?? "";
  return pattern.test(candidate) ? candidate : "";
}

export const adsenseClientId = validValue(
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  clientPattern,
);

export const adsenseHomeSlot = validValue(
  process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT,
  slotPattern,
);

export const adsenseOfferSlot = validValue(
  process.env.NEXT_PUBLIC_ADSENSE_OFFER_SLOT,
  slotPattern,
);

export const adsensePublisherId = adsenseClientId.replace(/^ca-/, "");
export const adsenseEnabled = Boolean(adsenseClientId);
