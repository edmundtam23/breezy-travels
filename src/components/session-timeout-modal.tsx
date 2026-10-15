import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionTimeoutModal({
  open,
  secondsLeft,
  onStaySignedIn,
  onLogOutNow,
}: {
  open: boolean;
  secondsLeft: number;
  onStaySignedIn: () => void;
  onLogOutNow: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onStaySignedIn()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Still there?</DialogTitle>
          <DialogDescription>
            You&apos;ve been inactive for a while. For your security,
            you&apos;ll be signed out in{" "}
            <span className="font-semibold tabular-nums">
              {formatCountdown(secondsLeft)}
            </span>{" "}
            unless you stay signed in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onLogOutNow}>
            Log out now
          </Button>
          <Button onClick={onStaySignedIn}>Stay signed in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
