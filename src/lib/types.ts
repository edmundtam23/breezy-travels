export type TravelMode = "WALKING" | "DRIVING" | "TRANSIT";

export interface Stop {
  id: string;
  placeId?: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  time: string; // "HH:MM"
  durationMin: number;
  blurb: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  photoUrl?: string;
  visitTip?: string | null;
  travelModeToNext: TravelMode;
}

export interface Day {
  id: string;
  title: string;
  summary: string;
  stops: Stop[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  days: Day[];
  createdAt: string;
  updatedAt: string;
}
