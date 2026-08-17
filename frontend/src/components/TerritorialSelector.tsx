import React from 'react';
import { MapPin, Building2, Search, ArrowRight, RotateCw, ChevronUp, ChevronDown, Sliders, X } from 'lucide-react';
import { EntidadResumen } from '../types';
import { useSecop } from '../hooks/useSecop';
import TerritoryFlagBadge from './TerritoryFlagBadge';
import { FavoriteEntityButton } from './FavoriteEntityButton';

interface TerritorialSelectorProps {
  onEntitySelected: (entity: EntidadResumen) => void;
  selectedEntity: EntidadResumen | null;
  isSidebarMode?: boolean;
}

export default function TerritorialSelector({ 
  onEntitySelected, 
  selectedEntity,
  isSidebarMode = false 
}: TerritorialSelectorProps) {
  const {
    departments,
    cities,
    entities,
    selectedDept,
    setSelectedDept,
    selectedCity,
    setSelectedCity,
    loadingDepts,
    loadingCities,
    loadingEntities,
    searchEntityText,
    setSearchEntityText,
    isCollapsed,
    setIsCollapsed,
    activeTab,
    setActiveTab,
    searchNit,
    setSearchNit,
    advancedEntities,
    loadingAdvanced,
    hasSearched,
    handleAdvancedSearch,
    handleSelectEntity,
    filteredEntities,
  } = useSecop(selectedEntity, onEntitySelected);

  // Compact sidebar collapsed view
  if (selectedEntity && isCollapsed) {
    return (
      <div 
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-3 transition-all duration-300 animate-fade-in hover:border-indigo-300 dark:hover:border-indigo-500"
        id="territorial-selector-collapsed"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shrink-0 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entidad Seleccionada</span>
              <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/30 font-semibold inline-flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Listo
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate mt-0.5" title={selectedEntity.nombre_entidad}>
              {selectedEntity.nombre_entidad}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-450 font-mono truncate">
                {selectedEntity.departamento} — {selectedEntity.ciudad}
              </p>
              <TerritoryFlagBadge 
                ciudad={selectedEntity.ciudad} 
                departamento={selectedEntity.departamento} 
                variant="compact"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs font-mono"
        >
          <Sliders className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span>Cambiar Territorio</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-fade-in ${
        isSidebarMode ? 'p-4 gap-4' : 'p-6 sm:p-8'
      }`} 
      id="territorial-selector-card"
    >
      {/* Traditional Header block */}
      {!isSidebarMode && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-xs font-mono text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 mb-3">
              <MapPin className="w-3.5 h-3.5" /> Consulta Territorial
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              Seleccione su territorio
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              La transparencia inicia en lo local. Busque su alcaldía, gobernación o entidad pública mediante el flujo territorial o por búsqueda directa.
            </p>
          </div>
          {selectedEntity && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-2xs font-mono"
              title="Minimizar panel de búsqueda de territorio"
            >
              <span>Contraer Panel</span>
              <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}
        </div>
      )}

      {/* Sidebar Mode Header block */}
      {isSidebarMode && (
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Territorio y Entidad</h3>
          </div>
          {selectedEntity && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-2 py-1 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950 transition-all cursor-pointer flex items-center gap-1 font-mono"
              title="Minimizar panel"
            >
              <span>Contraer</span>
              <ChevronUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}
        </div>
      )}

      {/* Greeting card and benefits (Omitted if in sidebar mode to prevent vertical noise) */}
      {!isSidebarMode && (
        <>
          {/* Tarjeta de Bienvenida */}
          <div className="mb-8 p-5 sm:p-6 bg-linear-to-r from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/25 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xs relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 rounded-full bg-indigo-100/30 dark:bg-indigo-900/15 blur-3xl pointer-events-none" />
            
            <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50 font-sans mb-2 flex items-center gap-2">
              <span>Bienvenido a Contrato-Claro</span>
            </h3>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              Contrato-Claro permite consultar, comparar, analizar, auditar y visualizar la contratación pública colombiana utilizando datos públicos de SECOP II. Compare entidades, analice contratos, identifique tendencias y fortalezca el control ciudadano de manera sencilla y transparente.
            </p>
          </div>

          {/* Sección Permanente: Beneficios Clave con tarjetas de tonos suaves */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Beneficio 1 */}
            <div className="p-4 sm:p-5 bg-[#F8F7FF] dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
              <div className="text-2xl mb-2.5">🛡️</div>
              <h4 className="text-xs font-bold font-mono text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Información oficial
              </h4>
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                Datos obtenidos directamente de SECOP II mediante la API de Datos Abiertos.
              </p>
            </div>

            {/* Beneficio 2 */}
            <div className="p-4 sm:p-5 bg-[#F3F2FF] dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
              <div className="text-2xl mb-2.5">🔎</div>
              <h4 className="text-xs font-bold font-mono text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Análisis simplificado
              </h4>
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                Transforme miles de registros en indicadores comprensibles para cualquier ciudadano.
              </p>
            </div>

            {/* Beneficio 3 */}
            <div className="p-4 sm:p-5 bg-[#EEF0FF] dark:bg-indigo-900/25 border border-indigo-100/70 dark:border-indigo-900/40 rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
              <div className="text-2xl mb-2.5">🤝</div>
              <h4 className="text-xs font-bold font-mono text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Control ciudadano
              </h4>
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                Compare entidades, contratos y contratistas para fortalecer la transparencia y la participación.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Tabs Layout */}
      <div className={`flex border-b border-slate-200 dark:border-slate-800 ${isSidebarMode ? 'mb-4' : 'mb-6'}`}>
        <button
          type="button"
          onClick={() => setActiveTab('territorio')}
          className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 px-3 sm:px-4 transition-all cursor-pointer flex items-center gap-1.5 font-mono uppercase tracking-wide ${
            activeTab === 'territorio'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-750 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Territorio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('avanzada')}
          className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 px-3 sm:px-4 transition-all cursor-pointer flex items-center gap-1.5 font-mono uppercase tracking-wide ${
            activeTab === 'avanzada'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-750 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Búsqueda NIT</span>
        </button>
      </div>

      {activeTab === 'territorio' ? (
        <div className="space-y-4">
          <div className={`grid gap-4 ${isSidebarMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Paso 1: Departamento */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                1. Departamento
              </label>
              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  disabled={loadingDepts}
                  className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl px-3 py-2 pr-10 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-600 dark:focus:ring-indigo-400 disabled:opacity-50 transition-all cursor-pointer text-slate-900 dark:text-slate-100"
                >
                  <option value="">Seleccione un departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  {loadingDepts ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Paso 2: Municipio / Ciudad */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                2. Municipio / Ciudad
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedDept || loadingCities}
                  className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl px-3 py-2 pr-10 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-600 dark:focus:ring-indigo-400 disabled:opacity-50 transition-all cursor-pointer text-slate-900 dark:text-slate-100"
                >
                  <option value="">
                    {!selectedDept ? 'Primero elija departamento...' : 'Seleccione un municipio...'}
                  </option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city === 'No Definido' ? 'No especificado en registro' : city}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  {loadingCities ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Paso 3: Entidad Contratante */}
          {selectedDept && selectedCity && (
            <div className="mt-4 space-y-2 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  3. Entidad Contratante ({filteredEntities.length})
                </label>
                {entities.length > 3 && (
                  <div className="relative w-full sm:w-48">
                    <input
                      type="text"
                      placeholder="Buscar entidad..."
                      value={searchEntityText}
                      onChange={(e) => setSearchEntityText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1 text-[10px] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors text-slate-900 dark:text-slate-100"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  </div>
                )}
              </div>

              {loadingEntities ? (
                <div 
                  className={`grid gap-2 ${
                    isSidebarMode 
                      ? 'grid-cols-1' 
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6].map((_, i) => (
                    <div 
                      key={i} 
                      className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                      <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-850 rounded" />
                    </div>
                  ))}
                </div>
              ) : entities.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20">
                  <p className="text-xs text-slate-400 font-mono">No se encontraron entidades en este municipio.</p>
                </div>
              ) : (
                <div 
                  className={`grid gap-2 overflow-y-auto pr-1 custom-scrollbar ${
                    isSidebarMode 
                      ? 'grid-cols-1 max-h-[180px]' 
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-[260px]'
                  }`}
                >
                  {filteredEntities.map((ent) => {
                    const isSelected = selectedEntity?.codigo_entidad === ent.codigo_entidad;
                    return (
                      <button
                        key={ent.codigo_entidad}
                        onClick={() => handleSelectEntity(ent)}
                        className={`flex items-start text-left gap-2.5 p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Building2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate leading-tight">{ent.nombre_entidad}</div>
                          <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'} flex flex-wrap gap-x-1.5`}>
                            <span>Cód: {ent.codigo_entidad}</span>
                          </div>
                        </div>
                        <ArrowRight className={`w-3 h-3 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                  {filteredEntities.length === 0 && (
                    <div className="col-span-full py-6 text-center">
                      <p className="text-[10px] text-slate-400 font-mono">Ninguna entidad coincide con la búsqueda.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Búsqueda Avanzada Panel */
        <div className="space-y-3 animate-fade-in">
          {!isSidebarMode && (
            <div className="bg-indigo-50/50 border border-indigo-100/60 dark:bg-slate-950 dark:border-slate-800 rounded-xl p-4 text-xs text-indigo-800 dark:text-indigo-400 space-y-1">
              <div className="font-bold flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                BUSQUEDA AVANZADA EN SECOP II
              </div>
              <p>
                Encuentre de forma directa cualquier alcaldía, gobernación o entidad pública registrada en SECOP II. Ingrese el NIT de la entidad (exacto, sin puntos ni guiones) para filtrar y haga clic en <strong>Buscar</strong>.
              </p>
            </div>
          )}

          <form 
            onSubmit={handleAdvancedSearch} 
            className={`flex gap-2 items-end bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-205 dark:border-slate-800/80 ${
              isSidebarMode ? 'flex-col sm:flex-col' : 'flex-col sm:flex-row'
            }`}
          >
            {/* Campo NIT */}
            <div className="space-y-1 flex-1 w-full">
              <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">
                NIT de la Entidad
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 890102018..."
                  value={searchNit}
                  onChange={(e) => setSearchNit(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-indigo-600 transition-all text-slate-800 dark:text-slate-100"
                />
                {searchNit && (
                  <button
                    type="button"
                    onClick={() => setSearchNit('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-1.5 self-stretch sm:self-auto pt-1 w-full sm:w-auto">
              {(searchNit || hasSearched) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchNit('');
                    handleAdvancedSearch({ preventDefault: () => {} } as any);
                  }}
                  className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 rounded-xl text-xs bg-white dark:bg-slate-900 transition-all cursor-pointer font-semibold flex-1 sm:flex-initial"
                >
                  Limpiar
                </button>
              )}
              <button
                type="submit"
                disabled={loadingAdvanced || !searchNit}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loadingAdvanced ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* Resultados de búsqueda avanzada */}
          <div className="space-y-2 mt-3">
            {loadingAdvanced ? (
              <div 
                className={`grid gap-2 ${
                  isSidebarMode 
                    ? 'grid-cols-1' 
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {[1, 2, 3].map((_, i) => (
                  <div 
                    key={i} 
                    className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-pulse"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                    <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-850 rounded" />
                  </div>
                ))}
              </div>
            ) : advancedEntities.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Resultados ({advancedEntities.length})</div>
                <div 
                  className={`grid gap-2 overflow-y-auto pr-1 custom-scrollbar ${
                    isSidebarMode 
                      ? 'grid-cols-1 max-h-[160px]' 
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-[220px]'
                  }`}
                >
                  {advancedEntities.map((ent) => {
                    const isSelected = selectedEntity?.codigo_entidad === ent.codigo_entidad;
                    return (
                      <button
                        key={ent.codigo_entidad}
                        type="button"
                        onClick={() => handleSelectEntity(ent)}
                        className={`flex items-start text-left gap-2 p-2 rounded-xl border text-xs transition-all group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:bg-indigo-50/20 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        <Building2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate leading-tight">{ent.nombre_entidad}</div>
                          <p className={`text-[9px] font-mono uppercase tracking-wide ${isSelected ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {ent.departamento} — {ent.ciudad}
                          </p>
                        </div>
                        <ArrowRight className={`w-3 h-3 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : hasSearched ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                <p className="text-xs text-slate-500 font-mono">No se encontraron entidades con ese NIT.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {selectedEntity && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-3xs">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">Entidad Seleccionada</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30 inline-flex items-center gap-1 font-semibold">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Listo
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate" title={selectedEntity.nombre_entidad}>
                {selectedEntity.nombre_entidad}
              </div>
              <FavoriteEntityButton entity={selectedEntity} />
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {selectedEntity.departamento} — {selectedEntity.ciudad} | Código: {selectedEntity.codigo_entidad}
            </div>
          </div>

          <div className="shrink-0">
            <TerritoryFlagBadge 
              ciudad={selectedEntity.ciudad} 
              departamento={selectedEntity.departamento} 
              variant="hero"
            />
          </div>
        </div>
      )}
    </div>
  );
}
