export type Space = {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  owner_name: string | null;
  progress_pct: number | null;
};

export type Category = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  block_count: number;
};

export type SpaceOverview = {
  id: string;
  title: string;
  description: string | null;
  is_owner: boolean;
  categories: Category[];
};