export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  CustomerDetail: { customer: any; fromScreen: string };
  Disposition: { customer: any; fromScreen: string };
  Settlement: { customer: any };
  PaymentLink: { customer: any };
  Receipt: { receipt: any; backTo: string };
  Import: undefined;
  Deposition: undefined;
  Profile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Allocations: { defaultBucket?: string };
  Smart: undefined;
  Visits: undefined;
};
