"use client";

import { useState } from "react";

type Part = {
  id: number;
  name: string;
  brand: string;
  carModel: string;
  yearRange: string;
  priceDzd: number;
  location: string;
};

const MOCK_PARTS: Part[] = [
  {
    id: 1,
    name: "Pare-chocs avant",
    brand: "Renault",
    carModel: "Clio 4",
    yearRange: "2013-2019",
    priceDzd: 18000,
    location: "Alger",
  },
  {
    id: 2,
    name: "Optique droite",
    brand: "Volkswagen",
    carModel: "Golf 7",
    yearRange: "2012-2019",
    priceDzd: 25000,
    location: "Oran",
  },
  {
    id: 3,
    name: "Filtre à air",
    brand: "Hyundai",
    carModel: "i10",
    yearRange: "2010-2016",
    priceDzd: 3000,
    location: "Constantine",
  },
  {
    id: 4,
    name: "Disques de frein (x2)",
    brand: "Peugeot",
    carModel: "208",
    yearRange: "2012-2019",
    priceDzd: 12000,
    location: "Blida",
  },
];

export default function HomePage() {
  const [query, setQuery] = useState("");

  const filteredParts = MOCK_PARTS.filter((part) => {
    const q = query.toLowerCase();
    return (
      part.name.toLowerCase().includes(q) ||
      part.brand.toLowerCase().includes(q) ||
      part.carModel.toLowerCase().includes(q) ||
      part.location.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header simple */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-900 px-2 py-1 text-sm font-semibold text-white">
              Autopiece
            </span>
            <span className="text-sm text-slate-500">
              Pièces détachées partout en Algérie
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <a href="/login" className="text-slate-600 hover:text-slate-900">
              Se connecter
            </a>
            <a
              href="/register/seller"
              className="rounded-md border border-slate-900 px-3 py-1 text-slate-900 hover:bg-slate-900 hover:text-white"
            >
              Devenir vendeur
            </a>
          </nav>
        </div>
      </header>

      {/* Hero + recherche */}
      <section className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Trouve tes pièces auto en Algérie, sans te prendre la tête.
            </h1>
            <p className="mb-6 text-sm text-slate-600 md:text-base">
              Parcours les pièces disponibles chez des vendeurs vérifiés.
              Pas besoin de compte pour naviguer. Tu entres ton email et ton
              numéro seulement au moment du paiement pour recevoir ton reçu
              et ton numéro de suivi.
            </p>

            <div className="mb-3">
              <label
                htmlFor="search"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Rechercher par pièce, marque, modèle ou ville
              </label>
              <div className="flex gap-2">
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: pare-chocs Clio 4 Alger"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Navigation 100% libre. Les infos (email + téléphone) ne sont
              demandées qu&apos;au moment du checkout.
            </p>
          </div>

          <div className="mt-6 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100 md:mt-0">
            <h2 className="mb-2 text-base font-semibold">
              Comment ça marche ?
            </h2>
            <ol className="space-y-2 text-xs text-slate-100/90">
              <li>1. Tu cherches ta pièce et tu l’ajoutes au panier.</li>
              <li>2. Au checkout, tu entres juste ton email et ton téléphone.</li>
              <li>
                3. On génère un numéro de suivi unique et tu reçois un reçu
                par email.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Liste des pièces */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pièces disponibles</h2>
          <p className="text-xs text-slate-500">
            Résultats : {filteredParts.length} / {MOCK_PARTS.length}
          </p>
        </div>

        {filteredParts.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune pièce ne correspond à ta recherche pour l’instant.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredParts.map((part) => (
              <article
                key={part.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
              >
                <div>
                  <h3 className="mb-1 text-sm font-semibold">
                    {part.name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {part.brand} · {part.carModel} · {part.yearRange}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ville : {part.location}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-semibold">
                    {part.priceDzd.toLocaleString("fr-DZ")} DA
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-slate-900 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-slate-900 hover:text-white"
                    onClick={() => {
                      // TODO: connecter à un vrai panier plus tard
                      alert(
                        `TODO: ajouter "${part.name}" au panier (prochaine étape).`
                      );
                    }}
                  >
                    Ajouter au panier
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
