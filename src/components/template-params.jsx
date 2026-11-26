import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { previewMessage } from "@/lib/templateParams";

// One row per {{n}} plus a preview. Renders nothing for plain templates.
const TemplateParams = ({ template, params }) => {
  if (params.items.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Message variables</p>
      {params.items.map((item, i) => {
        const isText = item.type === "text";
        const label = `{{${i + 1}}}`;
        return (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <Label className="w-10 text-xs font-mono">{label}</Label>
            <Select
              value={item.type}
              onValueChange={(type) => params.setItem(i, { type })}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_name">Contact's first name</SelectItem>
                <SelectItem value="name">Contact's full name</SelectItem>
                <SelectItem value="text">Typed text</SelectItem>
              </SelectContent>
            </Select>
            {!isText && (
              <span className="text-xs text-muted-foreground">
                if there is no name, use
              </span>
            )}
            <Input
              className="flex-1 min-w-[140px] h-8 text-xs"
              aria-label={isText ? `Text for ${label}` : `Fallback for ${label}`}
              placeholder={isText ? "Type the text" : "Fallback text"}
              value={isText ? item.text : item.fallback}
              onChange={(e) =>
                params.setItem(
                  i,
                  isText
                    ? { text: e.target.value }
                    : { fallback: e.target.value }
                )
              }
            />
          </div>
        );
      })}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Preview (names shown are a sample)
        </p>
        <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-sm">
          {previewMessage(template, params.items)}
        </p>
      </div>
      {!params.complete && (
        <p className="text-xs text-destructive">
          Fill every variable to continue.
        </p>
      )}
    </div>
  );
};

export default TemplateParams;
