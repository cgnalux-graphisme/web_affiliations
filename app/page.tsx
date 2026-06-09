import Link from "next/link";
import { forms, transferJourney } from "./forms";

function FormCard({ form }: { form: (typeof forms)[number] }) {
  return (
    <article className="group flex h-full flex-col justify-between rounded-3xl border border-red-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              {form.category}
            </p>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">{form.title}</h2>
          </div>

          <div className="rounded-2xl bg-red-700 p-3 text-white shadow-sm transition-transform group-hover:scale-105">
            <form.Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-600">{form.description}</p>
      </div>

      <Link
        href={form.href}
        className="mt-6 inline-flex w-fit items-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
      >
        {form.cta}
      </Link>
    </article>
  );
}

function TransferJourneyCard() {
  return (
    <section className="rounded-3xl border-2 border-red-300 bg-gradient-to-br from-red-100 via-red-50 to-white p-6 shadow-md ring-1 ring-red-200/60 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-900 p-3 text-white shadow-sm">
            <transferJourney.Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="inline-flex rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-800">
              {transferJourney.category}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-red-950">{transferJourney.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/75">
              {transferJourney.description}
            </p>
          </div>
        </div>
        <Link
          href={transferJourney.href}
          className="inline-flex w-fit shrink-0 items-center rounded-lg bg-red-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-950"
        >
          {transferJourney.cta}
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const [affiliation, mandatSepa, ...onemForms] = forms;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-3xl bg-red-700 px-6 py-8 text-white shadow-lg sm:px-8">
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Formulaires en ligne</h1>
          <p className="mt-3 max-w-2xl text-base text-red-50 sm:text-lg">
            Choisissez le formulaire correspondant a votre demande pour commencer.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <FormCard form={affiliation} />
          <FormCard form={mandatSepa} />
        </section>

        <TransferJourneyCard />

        <section className="grid gap-6 md:grid-cols-2">
          {onemForms.map((form) => (
            <FormCard key={form.href} form={form} />
          ))}
        </section>
      </div>
    </main>
  );
}
