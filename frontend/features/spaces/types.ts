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

export type TutorBlock = {
  id: string;
  position: number;
  type: string;
  content: Record<string, unknown>;
};

export type NodeLesson = {
  id: string;
  title: string;
  status: string;
  course_id: string;
  is_owner: boolean;
  blocks: TutorBlock[];
};