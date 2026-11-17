import { HomePage } from "@/components/pages";
import { publicBundle } from "@/lib/platform-cms";
import { contentMetadata } from "@/lib/public-pages";
export function generateMetadata() {
  const item = publicBundle().content.find((row) => row.type === "homepage");
  return contentMetadata(
    item
      ? ({ ...item.data, image: item.data.heroImage } as Parameters<
          typeof contentMetadata
        >[0])
      : undefined,
    "/",
  );
}
export default function Page() {
  return <HomePage />;
}
