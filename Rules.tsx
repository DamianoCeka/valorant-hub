import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Rules() {
  const { rules } = useStore();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 border-l-4 border-primary pl-6">
        <h1 className="text-5xl font-display mb-2">Rulebook</h1>
        <p className="text-muted-foreground text-lg">Official regulations for the DuoQ Cup.</p>
      </div>

      <div className="bg-card border border-white/10 rounded-lg p-8 md:p-12 shadow-2xl">
         <article className="prose prose-invert prose-headings:font-display prose-headings:tracking-wide prose-headings:uppercase prose-p:text-muted-foreground prose-li:text-muted-foreground max-w-none">
            <div className="whitespace-pre-wrap font-sans leading-relaxed">
                {rules.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) return <h1 key={i} className="text-3xl text-primary mt-8 mb-4">{line.replace('# ', '')}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-2xl text-white mt-6 mb-3">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2">{line.replace('- ', '')}</li>;
                    return <p key={i} className="mb-4">{line}</p>;
                })}
            </div>
         </article>
      </div>
    </div>
  );
}
