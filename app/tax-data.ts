export type StateTaxDefault = {
  code: string;
  name: string;
  rate: number;
  hasLocalTax: boolean;
};

// Statewide general rates as of midyear 2026. Local destination rates may add
// to these amounts, so every rate remains editable in the app.
export const stateTaxDefaults: StateTaxDefault[] = [
  { code: "AL", name: "Alabama", rate: 4, hasLocalTax: true },
  { code: "AK", name: "Alaska", rate: 0, hasLocalTax: true },
  { code: "AZ", name: "Arizona", rate: 5.6, hasLocalTax: true },
  { code: "AR", name: "Arkansas", rate: 6.5, hasLocalTax: true },
  { code: "CA", name: "California", rate: 7.25, hasLocalTax: true },
  { code: "CO", name: "Colorado", rate: 2.9, hasLocalTax: true },
  { code: "CT", name: "Connecticut", rate: 6.35, hasLocalTax: false },
  { code: "DE", name: "Delaware", rate: 0, hasLocalTax: false },
  { code: "DC", name: "District of Columbia", rate: 6, hasLocalTax: false },
  { code: "FL", name: "Florida", rate: 6, hasLocalTax: true },
  { code: "GA", name: "Georgia", rate: 4, hasLocalTax: true },
  { code: "HI", name: "Hawaii", rate: 4, hasLocalTax: false },
  { code: "ID", name: "Idaho", rate: 6, hasLocalTax: true },
  { code: "IL", name: "Illinois", rate: 6.25, hasLocalTax: true },
  { code: "IN", name: "Indiana", rate: 7, hasLocalTax: false },
  { code: "IA", name: "Iowa", rate: 6, hasLocalTax: true },
  { code: "KS", name: "Kansas", rate: 6.5, hasLocalTax: true },
  { code: "KY", name: "Kentucky", rate: 6, hasLocalTax: false },
  { code: "LA", name: "Louisiana", rate: 5, hasLocalTax: true },
  { code: "ME", name: "Maine", rate: 5.5, hasLocalTax: false },
  { code: "MD", name: "Maryland", rate: 6, hasLocalTax: false },
  { code: "MA", name: "Massachusetts", rate: 6.25, hasLocalTax: false },
  { code: "MI", name: "Michigan", rate: 6, hasLocalTax: false },
  { code: "MN", name: "Minnesota", rate: 6.875, hasLocalTax: true },
  { code: "MS", name: "Mississippi", rate: 7, hasLocalTax: true },
  { code: "MO", name: "Missouri", rate: 4.225, hasLocalTax: true },
  { code: "MT", name: "Montana", rate: 0, hasLocalTax: false },
  { code: "NE", name: "Nebraska", rate: 5.5, hasLocalTax: true },
  { code: "NV", name: "Nevada", rate: 6.85, hasLocalTax: true },
  { code: "NH", name: "New Hampshire", rate: 0, hasLocalTax: false },
  { code: "NJ", name: "New Jersey", rate: 6.625, hasLocalTax: false },
  { code: "NM", name: "New Mexico", rate: 4.875, hasLocalTax: true },
  { code: "NY", name: "New York", rate: 4, hasLocalTax: true },
  { code: "NC", name: "North Carolina", rate: 4.75, hasLocalTax: true },
  { code: "ND", name: "North Dakota", rate: 5, hasLocalTax: true },
  { code: "OH", name: "Ohio", rate: 5.75, hasLocalTax: true },
  { code: "OK", name: "Oklahoma", rate: 4.5, hasLocalTax: true },
  { code: "OR", name: "Oregon", rate: 0, hasLocalTax: false },
  { code: "PA", name: "Pennsylvania", rate: 6, hasLocalTax: true },
  { code: "RI", name: "Rhode Island", rate: 7, hasLocalTax: false },
  { code: "SC", name: "South Carolina", rate: 6, hasLocalTax: true },
  { code: "SD", name: "South Dakota", rate: 4.2, hasLocalTax: true },
  { code: "TN", name: "Tennessee", rate: 7, hasLocalTax: true },
  { code: "TX", name: "Texas", rate: 6.25, hasLocalTax: true },
  { code: "UT", name: "Utah", rate: 4.85, hasLocalTax: true },
  { code: "VT", name: "Vermont", rate: 6, hasLocalTax: true },
  { code: "VA", name: "Virginia", rate: 5.3, hasLocalTax: true },
  { code: "WA", name: "Washington", rate: 6.5, hasLocalTax: true },
  { code: "WV", name: "West Virginia", rate: 6, hasLocalTax: true },
  { code: "WI", name: "Wisconsin", rate: 5, hasLocalTax: true },
  { code: "WY", name: "Wyoming", rate: 4, hasLocalTax: true },
];

export function defaultStateTaxSettings(enabledState = "CA") {
  return Object.fromEntries(
    stateTaxDefaults.map((state) => [
      state.code,
      { enabled: state.code === enabledState, rate: state.rate },
    ]),
  ) as Record<string, { enabled: boolean; rate: number }>;
}

export function stateName(code: string) {
  return stateTaxDefaults.find((state) => state.code === code)?.name ?? code;
}
