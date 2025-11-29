export function AboutView() {
  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Sobre</h2>
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-2">
        <p className="text-gray-700">
          Log My Travel ajuda você a registrar viagens, paradas e veículos, integrando
          com Supabase para armazenamento e sincronização.
        </p>
        <p className="text-gray-700">
          Versão atual: 0.1.0. Este aplicativo é construído com React, TypeScript e Tailwind CSS.
        </p>
        <p className="text-gray-700">
          Agradecimentos: comunidade open-source e contribuintes. Para suporte, consulte a documentação.
        </p>
      </div>
    </div>
  );
}
