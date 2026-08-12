import { useState, useEffect } from 'react';
import { EntidadResumen } from '../types';
import { searchEntidades, getDepartamentos, getCiudades, getEntidades } from '../services/api';

export function useSecop(
  selectedEntity: EntidadResumen | null,
  onEntitySelected: (entity: EntidadResumen) => void
) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [entities, setEntities] = useState<EntidadResumen[]>([]);

  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedEnt, setSelectedEnt] = useState<string>(''); // codigo_entidad

  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const [searchEntityText, setSearchEntityText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Advanced search states
  const [activeTab, setActiveTab] = useState<'territorio' | 'avanzada'>('territorio');
  const [searchNit, setSearchNit] = useState('');
  const [advancedEntities, setAdvancedEntities] = useState<EntidadResumen[]>([]);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAdvancedSearch = async (e?: { preventDefault: () => void }) => {
    if (e) e.preventDefault();
    const cleanNit = searchNit.trim();

    if (!cleanNit) {
      return;
    }

    setLoadingAdvanced(true);
    setHasSearched(true);
    try {
      const results = await searchEntidades(cleanNit, 'advanced');
      setAdvancedEntities(results);
    } catch (err) {
      console.error(err);
      setAdvancedEntities([]);
    } finally {
      setLoadingAdvanced(false);
    }
  };

  // Auto-collapse when selectedEntity is loaded or changed
  useEffect(() => {
    if (selectedEntity) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [selectedEntity]);

  // Fetch departments on mount
  useEffect(() => {
    async function loadDepts() {
      setLoadingDepts(true);
      try {
        const depts = await getDepartamentos();
        setDepartments(depts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDepts(false);
      }
    }
    loadDepts();
  }, []);

  // Fetch cities when department changes
  useEffect(() => {
    if (!selectedDept) {
      setCities([]);
      setSelectedCity('');
      setEntities([]);
      setSelectedEnt('');
      return;
    }

    async function loadCities() {
      setLoadingCities(true);
      try {
        const list = await getCiudades(selectedDept);
        setCities(list);
        setSelectedCity('');
        setEntities([]);
        setSelectedEnt('');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, [selectedDept]);

  // Fetch entities when city changes
  useEffect(() => {
    if (!selectedDept || !selectedCity) {
      setEntities([]);
      setSelectedEnt('');
      return;
    }

    async function loadEntities() {
      setLoadingEntities(true);
      try {
        const list = await getEntidades(selectedDept, selectedCity);
        setEntities(list);
        setSelectedEnt('');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEntities(false);
      }
    }
    loadEntities();
  }, [selectedDept, selectedCity]);

  const filteredEntities = entities.filter(ent =>
    ent.nombre_entidad.toLowerCase().includes(searchEntityText.toLowerCase())
  );

  const handleSelectEntity = (entidad: EntidadResumen) => {
    setSelectedEnt(entidad.codigo_entidad);
    onEntitySelected(entidad);
  };

  const resetTerritory = () => {
    setSelectedDept('');
    setSelectedCity('');
    setSelectedEnt('');
    setEntities([]);
    setSearchEntityText('');
  };

  return {
    departments,
    cities,
    entities,
    selectedDept,
    setSelectedDept,
    selectedCity,
    setSelectedCity,
    selectedEnt,
    setSelectedEnt,
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
    setAdvancedEntities,
    loadingAdvanced,
    hasSearched,
    setHasSearched,
    handleAdvancedSearch,
    handleSelectEntity,
    filteredEntities,
    resetTerritory,
  };
}
