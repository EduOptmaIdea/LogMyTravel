export function FaqsView() {
  const faqs = [
    { q: "Como inicio uma nova viagem?", a: "Preencha os campos obrigatórios em Nova viagem e toque em Iniciar." },
    { q: "Posso vincular um veículo à viagem?", a: "Sim, na Viagem atual você pode vincular e gerenciar veículos." },
    { q: "Onde vejo minhas viagens?", a: "Acesse Minhas viagens pelo menu ou pelo rodapé." },
  ];

  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Dúvidas frequentes</h2>
      <div className="bg-white rounded-xl shadow border border-gray-100 divide-y">
        {faqs.map((item, idx) => (
          <div key={idx} className="p-4">
            <div className="font-semibold text-[#192A56]">{item.q}</div>
            <div className="text-gray-700 mt-1">{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
