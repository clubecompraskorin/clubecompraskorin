export default function SiteFooter() {
  return (
    <footer className="bg-[#10231a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="font-bold text-sm tracking-wide text-white">J.Lopes Personal Support</div>
          <div className="text-xs text-white/50 mt-0.5">Consultoria &amp; Tecnologia Estratégica</div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
          <a href="https://wa.me/5511957737933" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            WhatsApp (11) 95773-7933
          </a>
          <a href="https://www.personalsupport.tec.br/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline underline-offset-2">
            personalsupport.tec.br
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 max-w-5xl mx-auto px-6 py-4 text-[11px] text-white/35">
        © {new Date().getFullYear()} Clube de Compras Korin — desenvolvido por Personal Support
      </div>
    </footer>
  )
}
