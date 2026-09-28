"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";

/**
 * Éditeur de texte riche du contenu d'un article : gras, italique, sous-titres,
 * listes, citations et liens. Produit du HTML (nettoyé à l'affichage public).
 */
export default function EditeurTexte({
  valeur,
  onChange,
  idLibelle,
  erreur,
  disabled,
}: {
  valeur: string;
  onChange: (html: string) => void;
  idLibelle: string;
  erreur?: boolean;
  disabled?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        underline: false,
        strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto", "tel"] },
      }),
    ],
    content: valeur,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": idLibelle,
        class: "article-contenu article-contenu--edition min-h-[320px] px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-militant-rouge ${
        erreur ? "border-2 border-militant-bordeaux" : "border-militant-ardoise"
      }`}
    >
      {editor ? <BarreOutils editor={editor} /> : <div className="h-[53px] border-b border-militant-ardoise" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function BarreOutils({ editor }: { editor: Editor }) {
  const etat = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      gras: e.isActive("bold"),
      italique: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      puces: e.isActive("bulletList"),
      numeros: e.isActive("orderedList"),
      citation: e.isActive("blockquote"),
      lien: e.isActive("link"),
      annuler: e.can().undo(),
      retablir: e.can().redo(),
    }),
  });
  const [saisieLien, setSaisieLien] = useState<string | null>(null);
  const [erreurLien, setErreurLien] = useState("");
  const champLien = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saisieLien !== null) champLien.current?.focus();
  }, [saisieLien !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function ouvrirLien() {
    setErreurLien("");
    setSaisieLien((editor.getAttributes("link").href as string | undefined) ?? "");
  }

  function appliquerLien() {
    let url = (saisieLien ?? "").trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setSaisieLien(null);
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      setErreurLien("Ce lien n'est pas valide. Exemple : https://www.fgtb.be");
      return;
    }
    const chaine = editor.chain().focus().extendMarkRange("link");
    // Sans texte sélectionné, le lien est inséré avec son adresse comme texte.
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chaine.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      chaine.setLink({ href: url }).run();
    }
    setSaisieLien(null);
  }

  const c = () => editor.chain().focus();

  return (
    <div className="border-b border-militant-ardoise">
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap items-center gap-0.5 px-1.5 py-1.5">
        <Outil label="Gras" actif={etat.gras} onClick={() => c().toggleBold().run()}>
          <Bold size={18} />
        </Outil>
        <Outil label="Italique" actif={etat.italique} onClick={() => c().toggleItalic().run()}>
          <Italic size={18} />
        </Outil>
        <Separateur />
        <Outil label="Sous-titre" actif={etat.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={19} />
        </Outil>
        <Outil label="Petit sous-titre" actif={etat.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={19} />
        </Outil>
        <Separateur />
        <Outil label="Liste à puces" actif={etat.puces} onClick={() => c().toggleBulletList().run()}>
          <List size={18} />
        </Outil>
        <Outil label="Liste numérotée" actif={etat.numeros} onClick={() => c().toggleOrderedList().run()}>
          <ListOrdered size={18} />
        </Outil>
        <Outil label="Citation" actif={etat.citation} onClick={() => c().toggleBlockquote().run()}>
          <Quote size={18} />
        </Outil>
        <Separateur />
        <Outil label="Ajouter ou modifier un lien" actif={etat.lien || saisieLien !== null} onClick={ouvrirLien}>
          <Link2 size={18} />
        </Outil>
        {etat.lien && (
          <Outil label="Retirer le lien" onClick={() => c().extendMarkRange("link").unsetLink().run()}>
            <Unlink size={18} />
          </Outil>
        )}
        <span className="ml-auto flex">
          <Outil label="Annuler" disabled={!etat.annuler} onClick={() => c().undo().run()}>
            <Undo2 size={18} />
          </Outil>
          <Outil label="Rétablir" disabled={!etat.retablir} onClick={() => c().redo().run()}>
            <Redo2 size={18} />
          </Outil>
        </span>
      </div>

      {saisieLien !== null && (
        <div className="border-t border-militant-ardoise px-3 py-3">
          <label htmlFor="saisie-lien" className="mb-1.5 block text-sm font-semibold">
            Adresse du lien
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="saisie-lien"
              ref={champLien}
              type="url"
              inputMode="url"
              value={saisieLien}
              onChange={(e) => {
                setSaisieLien(e.target.value);
                setErreurLien("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  appliquerLien();
                }
                if (e.key === "Escape") setSaisieLien(null);
              }}
              placeholder="https://…"
              className="w-full rounded-xl border border-militant-ardoise px-3 py-2 text-sm focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
            />
            <button
              type="button"
              onClick={appliquerLien}
              className="shrink-0 rounded-xl bg-militant-bordeaux px-4 py-2 text-sm font-bold text-white hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={() => setSaisieLien(null)}
              className="shrink-0 rounded-xl border-2 border-militant-charbon px-4 py-1.5 text-sm font-bold hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
            >
              Annuler
            </button>
          </div>
          {erreurLien && <p className="mt-1 text-xs font-semibold text-militant-bordeaux">{erreurLien}</p>}
        </div>
      )}
    </div>
  );
}

function Outil({
  label,
  actif,
  disabled,
  onClick,
  children,
}: {
  label: string;
  actif?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={actif === undefined ? undefined : actif}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-40 ${
        actif ? "bg-militant-bordeaux text-white" : "text-militant-charbon hover:bg-militant-charbon hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Separateur() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-militant-ardoise" />;
}
