import React, { useState, useEffect } from 'react';
import { Save, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { createTank, updateTank, getTankById, uploadTankImage } from '../../services/tankService';
import { getAllMasterData } from '../../services/masterService';
import { getMasterRegulations } from '../../services/regulationService';
import { getUploadUrl } from '../../services/api';
import { MultiSelect } from '../ui/MultiSelect';

const initialState = {
  tank_number: '',
  owner: 'Smart Gas',
  mfgr: '',
  initial_test_date: '',
  date_mfg: '',
  pv_code: [],
  tank_code: '',
  un_code: [],
  capacity_l: '',
  mawp: '',
  design_temperature: '',
  tare_weight_kg: '',
  mgw_kg: '',
  mpl_kg: '',
  size: '',
  pump_type: '',
  vesmat: '',
  gross_kg: '',
  net_kg: '',
  color_body_frame: '',
  cabinet_type: '',
  frame_type: '',
  remark: '',
  evacuation_valve: '',
  tank_number_image_path: '',
  created_by: 'Admin',
  updated_by: 'Admin',
  regulations: [],
  product_id: [],
  safety_valve_brand_id: '',
  pid_id: '',
  ga_id: '',
  remark2: '',
  pv_id: '',
};

// Unwrap UniformResponseMiddleware envelope: {success, data, message} → data
const unwrap = (response) => {
  if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response) {
    return response.data;
  }
  return response;
};

export default function TankDetailsTab({ onClose, onSaveSuccess, tankId, existingTanks, setUnsavedRemarks }) {
  const [formData, setFormData] = useState(initialState);
  const [viewingImage, setViewingImage] = useState(null);

  const [masterData, setMasterData] = useState({
    manufacturer: [],
    standard: [],
    tankcode_iso: [],
    un_iso_code: [],
    design_temperature: [],
    cabinet: [],
    frame_type: [],
    pump: [],
    mawp: [],
    ownership: [],
    size: [],
    regulations: [],
    products: [],
    safety_valve_brands: [],
    pv_code: [],
    evacuation_valve_type: [],
    color_body_frame: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [errors, setErrors] = useState({});

  const isEditMode = !!tankId;

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const errorClass = 'border-red-500 focus:ring-red-500';

  // ensure inputs never get null/undefined
  const safeValue = (v) => (v == null ? '' : v);

  // --- HELPER FUNCTIONS ---
  const getOptValue = (opt) => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt !== 'object') return opt;
    return opt.name || opt.code || opt.standard || opt.value || opt.label || opt.size_label || JSON.stringify(opt);
  };

  const getOptLabel = (opt) => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt !== 'object') return opt;
    return opt.name || opt.label || opt.code || opt.standard || opt.value || opt.size_label || JSON.stringify(opt);
  };

  const formatTempLabel = (opt) => {
    const lbl = getOptLabel(opt);
    if (typeof lbl !== 'string') return lbl;
    // Replace occurrences like " C" with the degree symbol + C (e.g. "°C").
    return lbl.replace(/ ?C\b/g, '°C');
  };

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        setLoadingMasters(true);
        const data = await getAllMasterData();
        const masterRegs = await getMasterRegulations();
        if (data) {
          // backend uses success_resp which envelopes data in a 'data' field
          const regsRaw = unwrap(masterRegs);
          const regsList = (regsRaw && Array.isArray(regsRaw))
            ? regsRaw.filter(r => r.status !== 0)
            : [];
          setMasterData({
            ...data,
            regulations: regsList
          });
        }
      } catch (err) {
        console.error('Failed to load dropdown masters:', err);
      } finally {
        setLoadingMasters(false);
      }
    };
    fetchMasters();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setFormData(initialState);
      return;
    }

    if (loadingMasters) return;

    const fetchTankData = async () => {
      try {
        const raw = await getTankById(tankId);
        const data = unwrap(raw);

        if (!data) return;

        let loadedMawp = data.mawp || '';
        if (data.mawp && masterData.mawp?.length > 0) {
          const mawpStr = String(data.mawp).trim();
          const match = masterData.mawp.find((m) =>
            getOptValue(m).toString().trim().startsWith(mawpStr),
          );
          if (match) loadedMawp = getOptValue(match);
        }

        let loadedStandardIds = [];
        const standardSource = data.standard || data.pv_code || '';
        if (standardSource && masterData.standard?.length > 0) {
          loadedStandardIds = String(standardSource)
            .split(',')
            .map((s) => s.trim())
            .map((name) => {
              const match = masterData.standard.find(
                (s) => getOptValue(s).trim() === name,
              );
              return match ? String(match.id) : null;
            })
            .filter(Boolean);
        }

        setFormData({
          ...initialState,
          ...data,
          tank_code: data.tank_iso_code || '',
          initial_test_date: data.initial_test || '',
          mawp: loadedMawp,
          size: data.size || '',
          pv_code: loadedStandardIds,
          un_code: (() => {
            const unSource = data.un_code || data.un_iso_code || '';
            if (!unSource) return [];
            const codes = String(unSource).split(',').map((c) => c.trim());

            // Map names back to IDs from masterData
            const ids = codes.map(name => {
              const m = masterData.un_iso_code?.find(
                (u) => getOptValue(u).toString() === name,
              );
              return m ? String(m.id) : null;
            }).filter(Boolean);
            return ids;
          })(),
          product_id: (() => {
            const prodSource = data.product_id || '';
            if (!prodSource) return [];
            // If it's already an array (unlikely from API but good to handle)
            if (Array.isArray(prodSource)) return prodSource.map(String);
            // CSV of IDs
            return String(prodSource).split(',').map(s => s.trim()).filter(Boolean);
          })(),
          mpl_kg: (() => {
            const mgw = parseFloat(data.mgw_kg);
            const tare = parseFloat(data.tare_weight_kg);
            return !isNaN(mgw) && !isNaN(tare)
              ? String(mgw - tare)
              : '';
          })(),
          updated_by: 'Admin',
          regulations: data.regulations || [],
          safety_valve_brand_id: data.safety_valve_brand_id || '',
          remark2: data.remark2 || '',
          pv_id: data.pv_id || '',
        });
      } catch (err) {
        console.error('Failed to fetch tank data', err);
      }
    };

    fetchTankData();
  }, [tankId, isEditMode, loadingMasters, masterData]);


  const handleChange = (e) => {
    const { name, value, multiple, selectedOptions } = e.target;
    let newVal = value;
    if (multiple) {
      newVal = Array.from(selectedOptions).map((o) => o.value);
    }
    let newFormData = { ...formData, [name]: newVal };

    if (name === 'mgw_kg' || name === 'tare_weight_kg') {
      const mgw = name === 'mgw_kg' ? parseFloat(value) : parseFloat(formData.mgw_kg);
      const tare =
        name === 'tare_weight_kg' ? parseFloat(value) : parseFloat(formData.tare_weight_kg);

      if (!isNaN(mgw) && !isNaN(tare)) {
        const mpl = mgw - tare;
        newFormData.mpl_kg = mpl.toString();

        // Instant validation for MPL
        if (mpl < 0) {
          setErrors(prev => ({ ...prev, mpl_kg: 'MGW must be greater than or equal to Tare Weight.' }));
        } else {
          setErrors(prev => ({ ...prev, mpl_kg: null }));
        }
      }
    }
    setFormData(newFormData);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));

    // TRACK REMARKS CHANGE
    if (name === 'remark' || name === 'remark2') {
      if (setUnsavedRemarks) setUnsavedRemarks(true);
    }

    // INSTANT DATE VALIDATION
    if (name === 'date_mfg' && value) {
      const year = parseInt(value.split('-')[0]);
      if (year > 2999 || year < 1900) {
        setErrors(prev => ({ ...prev, date_mfg: 'Year must be between 1900 and 2999.' }));
      } else {
        setErrors(prev => ({ ...prev, date_mfg: null }));
      }
    }
  };

  const handleNumericKeyDown = (e) => {
    // Block '-' (minus), 'e' (scientific notation), and '+' (plus)
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleMultiChange = (name, value) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // If un_code changes, automatically select ALL products that match the selected UN codes
      if (name === 'un_code') {
        const selectedUnIds = value.map(String);
        const matchingProducts = (masterData.products || [])
          .filter(p => selectedUnIds.includes(String(p.un_code_id)))
          .map(p => String(p.id));

        newFormData.product_id = matchingProducts;
      }

      return newFormData;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleTankNumberBlur = () => {
    const val = formData.tank_number?.trim();
    if (!val || !existingTanks) return;

    // Check if this tank number exists in other records
    const duplicate = existingTanks.find(t =>
      t.tank_number?.toLowerCase() === val.toLowerCase() && t.id !== tankId
    );

    if (duplicate) {
      alert(`The tank number "${val}" already exists!`);
      setErrors(prev => ({ ...prev, tank_number: 'This tank already exists.' }));
    }
  };



  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return dateString.substring(0, 7);
  };

  const validate = () => {
    const newErrors = {};
    const data = formData;

    const requiredFields = [
      'tank_number',
      'owner',
      'mfgr',
      'tank_code',
      'un_code',
      'capacity_l',
      'mawp',
      'design_temperature',
      'tare_weight_kg',
      'mgw_kg',
      'size',
      'pump_type',
      'cabinet_type',
      'frame_type',
    ];

    requiredFields.forEach((field) => {
      const val = data[field];
      if (Array.isArray(val)) {
        if (val.length === 0) newErrors[field] = 'This field is required.';
      } else {
        if (!val) newErrors[field] = 'This field is required.';
      }
    });

    if (data.tank_number && data.tank_number.length > 20) {
      newErrors.tank_number = 'Max 20 characters allowed.';
    }

    if (data.date_mfg) {
      const year = parseInt(data.date_mfg.split('-')[0]);
      if (year > 2999 || year < 1900) {
        newErrors.date_mfg = 'Year must be between 1900 and 2999.';
      }
    }

    if (data.tare_weight_kg && parseFloat(data.tare_weight_kg) < 1) {
      newErrors.tare_weight_kg = 'Value must be at least 1.';
    }
    if (data.mgw_kg && parseFloat(data.mgw_kg) < 1) {
      newErrors.mgw_kg = 'Value must be at least 1.';
    }

    if (data.mgw_kg && data.tare_weight_kg) {
      if (parseFloat(data.mgw_kg) < parseFloat(data.tare_weight_kg)) {
        newErrors.mpl_kg = 'MGW must be greater than or equal to Tare Weight.';
      }
    }
    if (data.capacity_l && parseFloat(data.capacity_l) < 1) {
      newErrors.capacity_l = 'Value must be at least 1.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getIdFromName = (list, selectedValue, idKey = 'id') => {
    if (!list || !selectedValue) return null;
    if (typeof list[0] === 'string') return null;

    const item = list.find((x) => getOptValue(x) === selectedValue);
    return item ? item[idKey] : null;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = { ...formData };

      // Remove mpl_kg as it's auto-calculated in backend
      delete payload.mpl_kg;

      payload.initial_test = formData.initial_test_date;
      payload.tank_iso_code = formData.tank_code;

      // Handle Image Upload
      if (formData._imageFile) {
        try {
          const uploadRes = await uploadTankImage(formData._imageFile);
          if (uploadRes && uploadRes.path) {
            payload.tank_number_image_path = uploadRes.path;
          }
        } catch (uploadErr) {
          console.error("Image upload failed", uploadErr);
          alert("Image upload failed, saving tank without updating image.");
        }
      }
      delete payload._imageFile;

      // Ensure multi-select fields are arrays of IDs (numbers)
      payload.standard = Array.isArray(formData.pv_code)
        ? formData.pv_code.map((v) => parseInt(v, 10))
        : formData.pv_code;
      payload.un_code = Array.isArray(formData.un_code)
        ? formData.un_code.map((v) => parseInt(v, 10))
        : [];
      payload.regulations = Array.isArray(formData.regulations)
        ? formData.regulations.map((v) => parseInt(v, 10))
        : formData.regulations;

      payload.product_id = Array.isArray(formData.product_id)
        ? formData.product_id.map((v) => parseInt(v, 10))
        : [];
      payload.safety_valve_brand_id = formData.safety_valve_brand_id ? parseInt(formData.safety_valve_brand_id, 10) : null;
      payload.pv_id = formData.pv_id ? parseInt(formData.pv_id, 10) : null;

      // Remove updated_by as it's set in backend
      payload.updated_by = 'Admin';


      if (payload.mawp) payload.mawp = parseFloat(payload.mawp);
      if (payload.working_pressure) payload.working_pressure = parseFloat(payload.working_pressure);

      let savedTankId = tankId; // Start with current ID (null if creating)

      if (!isEditMode) {
        payload.ownership_id = getIdFromName(masterData.ownership, formData.owner);
        payload.manufacturer_id = getIdFromName(masterData.manufacturer, formData.mfgr);
        payload.tank_iso_code_id = getIdFromName(masterData.tankcode_iso, formData.tank_code);
        payload.design_temperature_id = getIdFromName(
          masterData.design_temperature,
          formData.design_temperature,
        );
        payload.cabinet_id = getIdFromName(masterData.cabinet, formData.cabinet_type);
        payload.frame_type_id = getIdFromName(masterData.frame_type, formData.frame_type);
        payload.pump_id = getIdFromName(masterData.pump, formData.pump_type);
        payload.mawp_id = getIdFromName(masterData.mawp, formData.mawp);
        // Send the free-form size string to the backend (backend accepts `size` or `size_id`).
        payload.size = formData.size;

        const response = await createTank(payload);
        console.log('Create Tank Response:', response); // Debugging

        // --- ROBUST ID EXTRACTION ---
        if (response) {
          // Check various patterns for the ID
          if (response.id) savedTankId = response.id;
          else if (response.data && response.data.id) savedTankId = response.data.id;
          else if (typeof response === 'number') savedTankId = response; // Direct number
          else if (response.tank_id) savedTankId = response.tank_id;
        }

        if (!savedTankId) {
          alert('Tank Saved, but could not retrieve ID from server. Please check console.');
          console.error('Could not find ID in:', response);
          return; // STOP HERE if no ID found
        }

        alert('Tank created successfully!');
      } else {
        await updateTank(tankId, payload);
        alert('Tank updated successfully!');
      }

      // RESET unsavedRemarks on success
      if (setUnsavedRemarks) setUnsavedRemarks(false);

      // Pass the found ID back to parent
      console.log('Passing ID to parent:', savedTankId);
      onSaveSuccess(savedTankId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || err.message;
      alert(`Failed to save tank: ${errMsg}`);
      setErrors({
        form: 'Failed to save tank. ' + errMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {errors.form && (
        <div className="p-3 mb-4 text-red-800 bg-red-100 border border-red-300 rounded-md">
          {errors.form}
        </div>
      )}

      <div className="flex-grow overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          {/* Tank Number */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Tank Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tank_number"
              value={safeValue(formData.tank_number)}
              onChange={handleChange}
              onBlur={handleTankNumberBlur}
              className={`${inputClass} ${errors.tank_number ? errorClass : ''}`}
            />
            {errors.tank_number && (
              <p className="text-xs text-red-500 mt-1">{errors.tank_number}</p>
            )}
          </div>

          {/* Owner */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Owner <span className="text-red-500">*</span>
            </label>
            <select
              name="owner"
              value={safeValue(formData.owner)}
              onChange={handleChange}
              className={`${inputClass} ${errors.owner ? errorClass : ''}`}
            >
              <option value="">-- Select Owner --</option>
              {masterData.ownership?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.owner && <p className="text-xs text-red-500 mt-1">{errors.owner}</p>}
          </div>

          {/* Manufacturer */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Manufacturer <span className="text-red-500">*</span>
            </label>
            <select
              name="mfgr"
              value={safeValue(formData.mfgr)}
              onChange={handleChange}
              className={`${inputClass} ${errors.mfgr ? errorClass : ''}`}
            >
              <option value="">-- Select Manufacturer --</option>
              {masterData.manufacturer?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.mfgr && <p className="text-xs text-red-500 mt-1">{errors.mfgr}</p>}
          </div>

          {/* Initial Test Date hidden per request */}
          {/* 
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Initial Test Date <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              name="initial_test_date"
              value={safeValue(formatDateForInput(formData.initial_test_date))}
              onChange={handleChange}
              className={`${inputClass} ${errors.initial_test_date ? errorClass : ''}`}
            />
            {errors.initial_test_date && (
              <p className="text-xs text-red-500 mt-1">{errors.initial_test_date}</p>
            )}
          </div>
          */}

          {/* Date MFG */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Date MFG <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              name="date_mfg"
              value={safeValue(formatDateForInput(formData.date_mfg))}
              onChange={handleChange}
              className={`${inputClass} ${errors.date_mfg ? errorClass : ''}`}
              min="1900-01"
              max="2999-12"
            />
            {errors.date_mfg && (
              <p className="text-xs text-red-500 mt-1">{errors.date_mfg}</p>
            )}
          </div>

          {/* Standard field hidden per request. Previously a multi-select for applicable standards. */}

          {/* Tank Code / ISO Code */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Tank Code / ISO Code <span className="text-red-500">*</span>
            </label>
            <select
              name="tank_code"
              value={safeValue(formData.tank_code)}
              onChange={handleChange}
              className={`${inputClass} ${errors.tank_code ? errorClass : ''}`}
            >
              <option value="">-- Select Tank Code --</option>
              {masterData.tankcode_iso?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.tank_code && <p className="text-xs text-red-500 mt-1">{errors.tank_code}</p>}
          </div>

          {/* UN Code */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              UN Code <span className="text-red-500">*</span>
            </label>
            <MultiSelect
              options={(masterData.un_iso_code || [])?.map((opt) => ({
                label: opt.code || getOptLabel(opt),
                value: String(opt.id),
              }))}
              height="h-24"
              value={(formData.un_code || []).map(String)}
              onChange={(val) => handleMultiChange('un_code', val)}
              placeholder="Select UN Codes..."
            />
            {errors.un_code && <p className="text-xs text-red-500 mt-1">{errors.un_code}</p>}
          </div>

          {/* Product (Filtered by UN Code) */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Product
            </label>
            <textarea
              value={(masterData.products || [])
                .filter(p => (formData.product_id || []).includes(String(p.id)))
                .map(p => p.product_name || p.name)
                .join(', ')}
              readOnly
              rows={2}
              className={`${inputClass} bg-gray-100 cursor-not-allowed resize-none`}
              placeholder="Auto-filled from UN Code"
            />
          </div>

          {/* Safety Valve Brand (Read-only in Tank Master) */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Safety Valve Brand
            </label>
            <input
              type="text"
              value={(() => {
                const brandId = formData.safety_valve_brand_id;
                const brand = masterData.safety_valve_brands?.find(b => String(b.id) === String(brandId));
                return brand ? brand.name || brand.brand_name : 'N/A';
              })()}
              readOnly
              className={`${inputClass} bg-gray-100 cursor-not-allowed`}
              placeholder="Set from Inspection"
            />
          </div>

          {/* Capacity */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Actual Capacity (L) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="capacity_l"
              value={safeValue(formData.capacity_l)}
              onChange={handleChange}
              onKeyDown={handleNumericKeyDown}
              className={`${inputClass} ${errors.capacity_l ? errorClass : ''}`}
              min="1"
            />
            {errors.capacity_l && (
              <p className="text-xs text-red-500 mt-1">{errors.capacity_l}</p>
            )}
          </div>

          {/* MAWP */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              MAWP <span className="text-red-500">*</span>
            </label>
            <select
              name="mawp"
              value={safeValue(formData.mawp)}
              onChange={handleChange}
              className={`${inputClass} ${errors.mawp ? errorClass : ''}`}
            >
              <option value="">-- Select MAWP --</option>
              {masterData.mawp?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.mawp && <p className="text-xs text-red-500 mt-1">{errors.mawp}</p>}
          </div>

          {/* Design Temperature */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Design Temperature <span className="text-red-500">*</span>
            </label>
            <select
              name="design_temperature"
              value={safeValue(formData.design_temperature)}
              onChange={handleChange}
              className={`${inputClass} ${errors.design_temperature ? errorClass : ''}`}
            >
              <option value="">-- Select Temp --</option>
              {masterData.design_temperature?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {formatTempLabel(opt)}
                </option>
              ))}
            </select>
            {errors.design_temperature && (
              <p className="text-xs text-red-500 mt-1">{errors.design_temperature}</p>
            )}
          </div>

          {/* Tare Weight */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Tare Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="tare_weight_kg"
              value={safeValue(formData.tare_weight_kg)}
              onChange={handleChange}
              onKeyDown={handleNumericKeyDown}
              className={`${inputClass} ${errors.tare_weight_kg ? errorClass : ''}`}
              min="1"
            />
            {errors.tare_weight_kg && (
              <p className="text-xs text-red-500 mt-1">{errors.tare_weight_kg}</p>
            )}
          </div>

          {/* MGW */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              MGW (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="mgw_kg"
              value={safeValue(formData.mgw_kg)}
              onChange={handleChange}
              onKeyDown={handleNumericKeyDown}
              className={`${inputClass} ${errors.mgw_kg ? errorClass : ''}`}
              min="1"
            />
            {errors.mgw_kg && <p className="text-xs text-red-500 mt-1">{errors.mgw_kg}</p>}
          </div>

          {/* MPL */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              MPL (MGW - Tare Weight)
            </label>
            <input
              type="number"
              name="mpl_kg"
              value={safeValue(formData.mpl_kg)}
              onChange={handleChange}
              readOnly
              className={`${inputClass} ${errors.mpl_kg ? 'border-red-500 bg-red-50' : 'bg-gray-100'} cursor-not-allowed`}
              placeholder="Auto-calculated"
            />
            {errors.mpl_kg && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errors.mpl_kg}</p>
            )}
          </div>

          {/* Pump */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Pump <span className="text-red-500">*</span>
            </label>
            <select
              name="pump_type"
              value={safeValue(formData.pump_type)}
              onChange={handleChange}
              className={`${inputClass} ${errors.pump_type ? errorClass : ''}`}
            >
              <option value="">-- Select Pump Status --</option>
              {masterData.pump?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.pump_type && <p className="text-xs text-red-500 mt-1">{errors.pump_type}</p>}
          </div>

          {/* Cabinet */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Cabinet <span className="text-red-500">*</span>
            </label>
            <select
              name="cabinet_type"
              value={safeValue(formData.cabinet_type)}
              onChange={handleChange}
              className={`${inputClass} ${errors.cabinet_type ? errorClass : ''}`}
            >
              <option value="">-- Select Cabinet --</option>
              {masterData.cabinet?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.cabinet_type && (
              <p className="text-xs text-red-500 mt-1">{errors.cabinet_type}</p>
            )}
          </div>

          {/* Frame Type */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Frame Type <span className="text-red-500">*</span>
            </label>
            <select
              name="frame_type"
              value={safeValue(formData.frame_type)}
              onChange={handleChange}
              className={`${inputClass} ${errors.frame_type ? errorClass : ''}`}
            >
              <option value="">-- Select Frame --</option>
              {masterData.frame_type?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.frame_type && (
              <p className="text-xs text-red-500 mt-1">{errors.frame_type}</p>
            )}
          </div>

          {/* Size */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Size <span className="text-red-500">*</span>
            </label>
            <select
              name="size"
              value={safeValue(formData.size)}
              onChange={handleChange}
              className={`${inputClass} ${errors.size ? errorClass : ''}`}
            >
              <option value="">-- Select Size --</option>
              {masterData.size?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
            {errors.size && <p className="text-xs text-red-500 mt-1">{errors.size}</p>}
          </div>

          {/* Remarks */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">Remarks</label>
            <input
              type="text"
              name="remark"
              value={safeValue(formData.remark)}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Color Body/Frame */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">Color – Body /Frame</label>
            <select
              name="color_body_frame"
              value={safeValue(formData.color_body_frame)}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">-- Select Color --</option>
              {masterData.color_body_frame?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
          </div>

          {/* Evacuation Valve */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">Evacuation Valve Type</label>
            <select
              name="evacuation_valve"
              value={safeValue(formData.evacuation_valve)}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">-- Select Type --</option>
              {masterData.evacuation_valve_type?.map((opt, idx) => (
                <option key={idx} value={getOptValue(opt)}>
                  {getOptLabel(opt)}
                </option>
              ))}
            </select>
          </div>

          {/* Tank Number Image */}
          <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-2">
            <label className="mb-1 text-sm font-medium text-gray-700">Tank Number Image</label>
            <div
              className="w-full max-w-md flex items-center border border-gray-300 rounded-md overflow-hidden h-[38px] cursor-pointer group hover:border-blue-400 transition-all bg-white"
              onClick={() => document.getElementById('tank_number_image').click()}
            >
              <input
                type="file"
                id="tank_number_image"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFormData((prev) => ({ ...prev, _imageFile: e.target.files[0] }));
                  }
                }}
                className="hidden"
              />
              <div className="bg-gray-100 px-3 h-full flex items-center border-r border-gray-300 text-[10px] font-semibold text-gray-600 group-hover:bg-gray-200 transition-colors whitespace-nowrap shrink-0">
                Choose
              </div>
              <div className="px-2 text-[11px] text-gray-500 truncate flex-grow min-w-0">
                {formData._imageFile
                  ? formData._imageFile.name
                  : formData.tank_number_image_path
                    ? formData.tank_number_image_path.split('/').pop().replace(/^\d+_/, '')
                    : 'No file chosen'}
              </div>
              {(formData.tank_number_image_path || formData._imageFile) && (
                <div
                  className="h-full px-3 flex items-center bg-green-600 text-white hover:bg-green-700 border-l border-green-700 shrink-0 transition-colors"
                  title="View Image"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = formData._imageFile
                      ? URL.createObjectURL(formData._imageFile)
                      : getUploadUrl(formData.tank_number_image_path);
                    setViewingImage({ url, title: 'Tank Number Image' });
                  }}
                >
                  <Eye className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          {/* PV Code */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">PV Code</label>
            <select
              name="pv_id"
              value={safeValue(formData.pv_id)}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">-- Select PV Code --</option>
              {masterData.pv_code?.map((opt, idx) => (
                <option key={idx} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Regulations - Moved inside grid and set to col-span-1 */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Select Regulations
            </label>
            <MultiSelect
              options={(Array.isArray(masterData.regulations) ? masterData.regulations : [])?.map((reg) => ({
                label: reg.regulation_name,
                value: String(reg.id),
              }))}
              height="h-24"
              value={formData.regulations.map(String)}
              onChange={(val) => handleMultiChange('regulations', val.map(v => parseInt(v, 10)))}
              placeholder="Select applicable regulations..."
            />
          </div>

          {/* Remarks 2 - Moved inside grid and set to col-span-3 */}
          <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-3">
            <label className="mb-1 text-sm font-medium text-gray-700">Remarks 2</label>
            <input
              type="text"
              name="remark2"
              value={safeValue(formData.remark2)}
              onChange={handleChange}
              className={inputClass}
              placeholder="Second remarks field"
            />
          </div>
        </div>


      </div>

      <div className="flex justify-end pt-6 mt-6 border-t space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium shadow-sm transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-white bg-[#546E7A] rounded-md hover:bg-[#455A64] font-medium shadow-sm flex items-center transition-colors text-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
        </button>
      </div>


      {/* Image Viewer Modal */}
      {
        viewingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg max-w-3xl max-h-[80vh] overflow-auto shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{viewingImage.title || 'View Image'}</h3>
                <Button onClick={() => setViewingImage(null)} className="bg-red-500 text-white hover:bg-red-600">Close</Button>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <img
                  src={viewingImage.url}
                  alt={viewingImage.title}
                  className="max-w-xl max-h-[60vh] object-contain border rounded-md"
                />
                <a
                  href={viewingImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
