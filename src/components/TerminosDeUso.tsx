import React, { useState } from 'react';
import { 
  Shield, 
  Database, 
  AlertTriangle, 
  Info, 
  Ban, 
  EyeOff, 
  Award, 
  ShieldAlert, 
  Scale, 
  CheckCircle2, 
  History, 
  FileCheck2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TerminosDeUso() {
  const [isOpen, setIsOpen] = useState(false);

  const terminos = [
    {
      num: 1,
      title: "Naturaleza de la herramienta",
      icon: <Shield className="w-3.5 h-3.5 text-slate-500" />,
      content: "Esta aplicación es una herramienta ciudadana de consulta y transparencia sobre la contratación pública reportada en el SECOP II. No es una herramienta oficial del Estado colombiano, ni de Colombia Compra Eficiente (ANCP-CCE), ni del Ministerio TIC, ni representa a ninguna entidad pública."
    },
    {
      num: 2,
      title: "Fuente de los datos",
      icon: <Database className="w-3.5 h-3.5 text-slate-500" />,
      content: "Toda la información mostrada proviene de la plataforma de Datos Abiertos de Colombia (datos.gov.co), dataset SECOP II — Contratos Electrónicos, publicado bajo Licencia Abierta. Los datos se consultan en tiempo real o desde un caché temporal en el navegador del usuario."
    },
    {
      num: 3,
      title: "Posible desactualización o errores de origen",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
      content: "La información puede contener errores, omisiones o desactualizaciones provenientes de la fuente original. La aplicación no garantiza la exactitud, integridad ni vigencia de los datos. Verifique siempre el proceso original en la URL oficial del SECOP que se proporciona en cada registro."
    },
    {
      num: 4,
      title: "Uso exclusivamente informativo y de control ciudadano",
      icon: <Info className="w-3.5 h-3.5 text-slate-500" />,
      content: "La herramienta se proporciona para fines de consulta, seguimiento y control ciudadano. No constituye asesoría legal, contable, financiera ni judicial."
    },
    {
      num: 5,
      title: "Prohibición de uso difamatorio",
      icon: <Ban className="w-3.5 h-3.5 text-rose-500" />,
      content: "Queda prohibido utilizar la información presentada para difamar, calumniar, injuriar o realizar acusaciones nominativas contra personas naturales o jurídicas. Los indicadores muestran patrones para consulta ciudadana y no constituyen prueba de irregularidad."
    },
    {
      num: 6,
      title: "Datos personales",
      icon: <EyeOff className="w-3.5 h-3.5 text-slate-500" />,
      content: "La aplicación aplica minimización de datos: no muestra información bancaria, números de documento de identidad ni domicilios, salvo lo estrictamente necesario para la consulta de transparencia contractual amparado por la Ley 1712 de 2014. Quienes consideren que un dato personal requiere rectificación, actualización o supresión pueden dirigirse a la fuente original o contactar a los administradores de la herramienta."
    },
    {
      num: 7,
      title: "Atribución",
      icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
      content: "Al reutilizar o citar información obtenida a través de esta herramienta, debe atribuir la fuente: \"Datos Abiertos de Colombia (datos.gov.co) — SECOP II\""
    },
    {
      num: 8,
      title: "Sin garantías",
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />,
      content: "La aplicación se ofrece \"tal cual\", sin garantías de ningún tipo, expresas ni implícitas. Los administradores de la herramienta no asumen responsabilidad por decisiones tomadas con base en la información presentada."
    },
    {
      num: 9,
      title: "Limitación de responsabilidad",
      icon: <Scale className="w-3.5 h-3.5 text-slate-500" />,
      content: "Los administradores de la aplicación no serán responsables por daños directos, indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso de la herramienta, ni por la interpretación que terceros hagan de los datos presentados."
    },
    {
      num: 10,
      title: "Uso aceptable",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />,
      content: "El usuario se compromete a no utilizar la herramienta para: realizar denegación de servicio o sobrecargar la API; recolectar datos personales para fines ajenos a la transparencia; publicar o difundir listados con propósito de hostigamiento."
    },
    {
      num: 11,
      title: "Modificaciones",
      icon: <History className="w-3.5 h-3.5 text-slate-500" />,
      content: "Estos Términos pueden actualizarse. La fecha de \"Última actualización\" indicará el cambio más reciente."
    },
    {
      num: 12,
      title: "Aceptación",
      icon: <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />,
      content: "El uso de la herramienta implica la aceptación de estos Términos."
    }
  ];

  return (
    <div 
      className="bg-slate-50/50 border border-slate-200 rounded-xl transition-all overflow-hidden max-w-5xl mx-auto" 
      id="terminos-de-uso-container"
    >
      {/* Header clickable to expand/collapse (small and subtle) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2.5 px-4 hover:bg-slate-100/60 transition-all cursor-pointer text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 text-xs">
              Términos de Uso — Contrato-Claro
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Anexo A • Responsabilidad Ciudadana
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <span>{isOpen ? 'Contraer' : 'Leer'}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content Area */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white space-y-4 animate-fade-in">
          <p className="text-[11px] text-slate-400 leading-relaxed italic max-w-2xl">
            Documento de diseño del proyecto (Anexo A). Establece las pautas del uso ético y de control cívico para el seguimiento cívico responsable.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {terminos.map((item) => (
              <div 
                key={item.num} 
                className="flex gap-2 p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all"
              >
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {item.num}.
                  </span>
                  <div className="mt-1">
                    {item.icon}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-slate-700 text-[11px]">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
            <span>Última actualización: 18 de Julio, 2026</span>
            <span className="text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 flex items-center gap-1 shrink-0">
              <FileCheck2 className="w-3 h-3 text-slate-500" /> Aceptado con el uso del aplicativo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
