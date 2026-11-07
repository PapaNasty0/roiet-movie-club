export type RsvpStatus = "might_go" | "probably_go" | "booked";

export type User = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  notify_new_movies: boolean;
  email_verified: boolean;
  /** Profile photo: Neon storage ref, data URL, or https URL (empty = none). */
  avatar_url: string;
  /** True when a password hash is stored (email/password sign-in). */
  has_password: boolean;
  /** True when a real Google OAuth id is linked (not Neon Auth placeholders). */
  has_google: boolean;
};

export type Skin = {
  id: string;
  name: string;
  description: string;
  css_vars: Record<string, string>;
  hero_overlay: string;
  is_default: boolean;
};

export type Movie = {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  rating: string;
  length_minutes: number;
  showtime_start: string | null;
  showtime_end: string | null;
  youtube_trailer_id: string;
  reviews_summary: string;
  poster_url: string;
  cinema: string;
  skin_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Rsvp = {
  id: string;
  movie_id: string;
  user_id: string;
  status: RsvpStatus;
  adults: number;
  children: number;
};

export type RsvpAggregate = {
  status: RsvpStatus;
  people: number;
  parties: number;
};

export type RsvpAttendee = {
  user_id: string;
  display_name: string;
  status: RsvpStatus;
  adults: number;
  children: number;
};

export type ForumPost = {
  id: string;
  movie_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
};

export type GalleryPhoto = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  outing_date: string | null;
  sort_order: number;
};

export type SiteContent = {
  key: string;
  label: string;
  value: string;
};
