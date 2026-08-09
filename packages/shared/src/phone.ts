// Phone numbers, normalised to E.164.
//
// Palestine has two country codes in daily use — +970 was allocated to the
// State of Palestine, and +972 still carries most West Bank mobile traffic
// because of how the networks were built. Both are real, members type both,
// and a product that accepts only one tells half its users their number is
// invalid.
//
// Gaza and West Bank mobile prefixes (059x Jawwal, 056x Ooredoo) are the same
// under either code, so normalisation is: strip everything that is not a digit,
// take the national part, and put the chosen country code back on the front.

/** The country codes Baydar accepts, without the plus. */
export const PHONE_COUNTRY_CODES = ["970", "972"] as const;

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/**
 * Arabic-Indic digits fold to ASCII before anything else looks at them.
 *
 * A number typed on an Arabic keyboard arrives as ٠٥٩١٢٣٤٥٦, and every
 * downstream check — length, prefix, the E.164 regex — reads that as garbage.
 * This is the first thing that runs, not a special case somewhere later.
 */
export function foldDigits(input: string): string {
  return input.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));
}

/**
 * A typed number, or null if it cannot be one.
 *
 * Accepts `0599123456`, `+970599123456`, `00972 59 912 3456`, and the same
 * with Arabic digits or spaces and dashes. Returns `+970599123456` shape.
 *
 * Returns null rather than throwing: this runs on keystrokes in a form, and an
 * exception per keystroke is not an error path, it is a design mistake.
 */
export function toE164(input: string, defaultCountry: "970" | "972" = "970"): string | null {
  const digits = foldDigits(input).replace(/\D/g, "");
  if (!digits) return null;

  let rest = digits;
  let country: string = defaultCountry;

  if (rest.startsWith("00")) rest = rest.slice(2);
  for (const code of PHONE_COUNTRY_CODES) {
    if (rest.startsWith(code)) {
      country = code;
      rest = rest.slice(code.length);
      break;
    }
  }

  // A leading zero is the national trunk prefix and never survives into E.164.
  rest = rest.replace(/^0+/, "");

  // Palestinian mobile and landline national numbers are 8-9 digits. Anything
  // outside that is not a number this product can send a code to, and pretending
  // otherwise burns an SMS.
  if (rest.length < 8 || rest.length > 9) return null;

  return `+${country}${rest}`;
}

/** Already-normalised numbers only. What the API accepts on the wire. */
export const E164_PATTERN = /^\+(?:970|972)\d{8,9}$/;

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value);
}

/**
 * The last four digits, for "we sent a code to a number ending 3456".
 *
 * Showing the whole number back is how a stolen session confirms which number
 * to social-engineer; showing nothing makes the member wonder which of their
 * two SIMs it went to.
 */
export function phoneTail(e164: string): string {
  return e164.slice(-4);
}
