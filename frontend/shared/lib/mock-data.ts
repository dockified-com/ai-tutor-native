import { Course, Enrollment } from "../types/course";

export const MOCK_COURSES: Course[] = [
  {
    id: "c_1",
    title: "Introduction to Rust",
    description: "A comprehensive guide to Rust programming, focusing on ownership, borrowing, and concurrency.",
    status: "published",
    created_at: new Date().toISOString(),
    lessons: [
      { id: "l1", title: "Why Rust?", block_count: 5 },
      { id: "l2", title: "Ownership and Borrowing", block_count: 12 },
      { id: "l3", title: "Structs and Enums", block_count: 8 },
    ],
  },
  {
    id: "c_2",
    title: "Advanced React Patterns",
    description: "Learn advanced React concepts like Server Components, Actions, and custom hook design.",
    status: "ready",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    lessons: [
      { id: "l4", title: "Server Components Deep Dive", block_count: 10 },
      { id: "l5", title: "Suspense and Streaming", block_count: 7 },
    ],
  },
  {
    id: "c_3",
    title: "Python for Data Science",
    description: "Data analysis and visualization using Pandas, NumPy, and Matplotlib.",
    status: "generating",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    lessons: [],
  },
  {
    id: "c_4",
    title: "Go Concurrency Fundamentals",
    description: "Mastering goroutines, channels, and the sync package in Go.",
    status: "draft",
    created_at: new Date(Date.now() - 259200000).toISOString(),
    lessons: [],
  }
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "e_1",
    course_id: "c_1",
    user_id: "user_1",
    progress_percentage: 35,
    last_accessed_at: new Date().toISOString(),
  }
];
