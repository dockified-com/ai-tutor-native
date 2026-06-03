export type CourseStatus = 'draft' | 'generating' | 'ready' | 'published' | 'failed';

export interface Lesson {
  id: string;
  title: string;
  block_count: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  current_phase?: string;
  total_lessons?: number;
  lessons: Lesson[];
  created_at: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  user_id: string;
  progress_percentage: number;
  last_accessed_at: string;
}
