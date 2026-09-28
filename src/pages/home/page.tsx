import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BookMeta } from "@/types";
import AppHeader from "@/components/AppHeader";
import Dashboard from "@/components/Dashboard";
import UploadModal from "@/components/UploadModal";
import { useLibrary } from "@/hooks/useLibrary";
import { useToast } from "@/context/ToastContext";

export default function Home() {
  const navigate = useNavigate();
  const library = useLibrary();
  const { pushToast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleConfirm = useCallback(
    async (input: { meta: BookMeta; rawContent: string; filteredContent: string }) => {
      await library.addBook(input);
      pushToast(`"${input.meta.title}" foi adicionado à sua estante.`, "success");
    },
    [library, pushToast]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      const target = library.books.find((b) => b.id === id);
      await library.removeBook(id);
      pushToast(
        target ? `"${target.title}" foi removido.` : "Livro removido.",
        "info"
      );
    },
    [library, pushToast]
  );

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100">
      <AppHeader onImport={() => setUploadOpen(true)} />
      <Dashboard
        books={library.books}
        lastBookId={library.lastBookId}
        onImport={() => setUploadOpen(true)}
        onOpenBook={(id) => {
          library.setLastBookId(id);
          navigate(`/practice/${id}`);
        }}
        onRemoveBook={handleRemove}
      />
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}