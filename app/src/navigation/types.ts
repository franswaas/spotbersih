import type { Report } from "../types/report";

export type RootStackParamList = {
  Login: undefined;
  VerifyEmail: undefined;
  Home: undefined;
  LiveScanner: undefined;
  Report: undefined;
  Reports: undefined;
  ReportDetails: {
    report: Report;
  };
};
