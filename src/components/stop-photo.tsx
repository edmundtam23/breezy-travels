import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StopThumbnail } from "@/components/stop-thumbnail";
import {
  fetchPlacePhoto,
  placePhotoUrl,
  type PlacePhoto,
} from "@/lib/place-photos";

// Thumbnail for a stop: live Google Places photo when available, otherwise
// the category-emoji fallback. Photos are fetched per view (ToS forbids
// storing them) with a tab-lifetime cache; tap opens a lightbox carrying the
// mandatory photo attribution.
export function StopPhoto({
  placeId,
  name,
  category,
  index,
  apiKey,
}: {
  placeId?: string;
  name: string;
  category?: string;
  index: number;
  apiKey: string;
}) {
  const [photo, setPhoto] = useState<PlacePhoto | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!placeId || !apiKey) {
      setPhoto(null);
      return;
    }
    let cancelled = false;
    fetchPlacePhoto(placeId, apiKey).then((p) => {
      if (!cancelled) setPhoto(p);
    });
    return () => {
      cancelled = true;
    };
  }, [placeId, apiKey]);

  if (!photo) {
    return <StopThumbnail category={category} index={index} />;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-14 w-14 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-muted"
        aria-label={`View photo of ${name}`}
      >
        <img
          src={placePhotoUrl(photo.photoName, apiKey)}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
          {index + 1}
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <img
            src={placePhotoUrl(photo.photoName, apiKey, 1200)}
            alt={name}
            className="max-h-[70vh] w-full rounded-lg object-cover"
          />
          {photo.attribution ? (
            <p className="text-xs text-muted-foreground">
              Photo by {photo.attribution} via Google Maps
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
