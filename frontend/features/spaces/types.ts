export type Space = {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  owner_name: string | null;
  progress_pct: number | null;
};