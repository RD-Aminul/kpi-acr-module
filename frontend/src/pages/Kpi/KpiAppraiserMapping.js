import React, { useState, useEffect } from 'react';
import { getData, postData } from 'services/ApiService';
import Select from "react-select";
import { Table } from 'components';
import loadingIcon from "assets/images/MainPhoto/loadingIcon.gif";
import editIcon from "assets/images/MainPhoto/editIcon.png";
import {
    successNotification,
    errorNotification,
    dropdownStyles3,
    toStringOrNull,
    toStringOrEmpty,
    toNumberOrNull,
    toUpperKeys,
    isEmptyOrNull
} from "pages/MainMenu/CommonFiles/utilities";

function KpiAppraiserMapping() {
    //#region User Data
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const { userId, ipAddress, gid, cid } = userData;
    //#endregion

    //#region State
    const [loading, setLoading] = useState(true);
    const [showSearchSpinner, setShowSearchSpinner] = useState(false);
    const [showClearSpinner, setShowClearSpinner] = useState(false);
    const [showEntryModalSpinner, setShowEntryModalSpinner] = useState(false);

    const [referenceOptions, setReferenceOptions] = useState([]);
    const [selectedFilterReference, setSelectedFilterReference] = useState(null);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [mappingList, setMappingList] = useState([]);

    // Modal
    const [isShowEntryModal, setShowEntryModal] = useState(false);
    const [mappingNo, setMappingNo] = useState(0);
    const [selectedModalReference, setSelectedModalReference] = useState(null);
    const [selectedModalEmployee, setSelectedModalEmployee] = useState(null);
    const [selectedModalAppraiser, setSelectedModalAppraiser] = useState(null);

    // Multi-select custom styles (prevents fixed height 25px squeeze when multiple tags are selected)
    const multiSelectStyles = {
        ...dropdownStyles3,
        control: (base) => ({
            ...base,
            minHeight: 28,
            height: 'auto',
            cursor: 'pointer'
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "#dde2fa",
            borderRadius: 3,
            padding: "1px 3px"
        }),
        multiValueLabel: (base) => ({
            ...base,
            fontSize: "9pt",
            color: "#333"
        })
    };

    const [activeOptions] = useState([
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' }
    ]);
    const [selectedActiveStat, setSelectedActiveStat] = useState({ value: 1, label: 'Active' });

    const [isSaving, setIsSaving] = useState(false);
    //#endregion

    useEffect(() => {
        loadDropdowns();
    }, []);

    const loadDropdowns = async () => {
        try {
            setLoading(true);
            const [refRes, empRes] = await Promise.all([
                getData('KpiAcr/GetReferenceList'),
                getData(`WhDepartmentIndent/GetEmployeeList?GID=${encodeURIComponent(gid || 0)}&CID=${encodeURIComponent(cid || 0)}&CompanyNo=1`)
            ]);

            if (refRes.status === true && Array.isArray(refRes.response)) {
                const refs = toUpperKeys(refRes.response).map(r => ({
                    value: r.REFERENCE_NO || r.REFERENCENO,
                    label: r.REFERENCE_CODE || r.REFERENCECODE
                }));
                setReferenceOptions(refs);
                if (refs.length > 0) {
                    setSelectedFilterReference(refs[0]);
                    await fetchMappings(refs[0].value);
                }
            }

            if (empRes.status === true && Array.isArray(empRes.response)) {
                const emps = toUpperKeys(empRes.response).map(e => ({
                    value: e.EMP_NO || e.EMPLOYEE_NO,
                    label: `${e.EMPLOYEE_NAME || e.EMP_NAME} (${e.EMPLOYEE_CODE || e.EMP_CODE || e.EMP_NO})`
                }));
                setEmployeeOptions(emps);
            }
        } catch (err) {
            console.error("Error loading dropdowns:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMappings = async (refNo) => {
        if (!refNo) return;
        try {
            setLoading(true);
            const apiUrl = `KpiAcr/GetAppraiserMappingDataList?ReferenceNo=${encodeURIComponent(refNo)}`;
            const { response, status } = await getData(apiUrl);
            if (status === true && Array.isArray(response)) {
                setMappingList(toUpperKeys(response));
            } else {
                setMappingList([]);
            }
        } catch (err) {
            console.error("Error fetching mapping list:", err);
            errorNotification("Error loading appraiser mappings");
        } finally {
            setLoading(false);
        }
    };

    const onSearchClick = async () => {
        try {
            setShowSearchSpinner(true);
            await fetchMappings(selectedFilterReference?.value);
        } finally {
            setShowSearchSpinner(false);
        }
    };

    const onClearFilter = () => {
        setShowClearSpinner(true);
        if (referenceOptions.length > 0) {
            setSelectedFilterReference(referenceOptions[0]);
            fetchMappings(referenceOptions[0].value);
        } else {
            setMappingList([]);
        }
        setShowClearSpinner(false);
    };

    const clearModalForm = () => {
        setMappingNo(0);
        setSelectedModalReference(selectedFilterReference);
        setSelectedModalEmployee(null);
        setSelectedModalAppraiser(null);
        setSelectedActiveStat({ value: 1, label: 'Active' });
    };

    const onEntryModalClick = () => {
        if (!selectedFilterReference) {
            errorNotification("Please select a KPI Reference Cycle first.");
            return;
        }
        clearModalForm();
        setShowEntryModal(true);
    };

    const onEditRowClick = (row) => {
        setMappingNo(row.MAPPING_NO || 0);
        setSelectedModalReference(referenceOptions.find(r => r.value === row.REFERENCE_NO) || null);
        setSelectedModalEmployee(employeeOptions.find(e => Number(e.value) === Number(row.EMPLOYEE_NO)) || { value: row.EMPLOYEE_NO, label: `Emp #${row.EMPLOYEE_NO}` });
        setSelectedModalAppraiser(employeeOptions.find(e => Number(e.value) === Number(row.APPRAISER_EMPLOYEE_NO)) || { value: row.APPRAISER_EMPLOYEE_NO, label: `Emp #${row.APPRAISER_EMPLOYEE_NO}` });
        setSelectedActiveStat(activeOptions.find(o => o.value === row.ACTIVE_STAT) || { value: 1, label: 'Active' });
        setShowEntryModal(true);
    };

    const handleSubmit = async () => {
        if (!selectedModalReference) {
            errorNotification("Please select a KPI Reference Cycle.");
            return;
        }
        if (!selectedModalAppraiser) {
            errorNotification("Please select Appraiser (Supervisor).");
            return;
        }
        if (!selectedModalEmployee || (Array.isArray(selectedModalEmployee) && selectedModalEmployee.length === 0)) {
            errorNotification("Please select at least one Appraisee (Employee).");
            return;
        }

        try {
            setIsSaving(true);
            const apiUrl = 'KpiAcr/SaveAppraiserMapping';

            // Check if multiple employees selected or single edit
            const isMulti = Array.isArray(selectedModalEmployee);
            const empNos = isMulti
                ? selectedModalEmployee.map(item => Number(item.value))
                : [Number(selectedModalEmployee.value)];

            // Check if supervisor is included in employee list
            if (empNos.includes(Number(selectedModalAppraiser.value))) {
                errorNotification("Supervisor cannot be their own Appraisee.");
                setIsSaving(false);
                return;
            }

            const data = {
                MappingNo: mappingNo,
                ReferenceNo: Number(selectedModalReference.value),
                EmployeeNo: isMulti ? 0 : Number(selectedModalEmployee.value),
                EmployeeNos: isMulti ? empNos : null,
                AppraiserEmployeeNo: Number(selectedModalAppraiser.value),
                ActiveStat: Number(selectedActiveStat?.value ?? 1),
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData(apiUrl, data);
            if (status === true) {
                successNotification(response?.message || "Appraiser mapping saved successfully.");
                setShowEntryModal(false);
                clearModalForm();
                fetchMappings(selectedFilterReference.value);
            } else {
                errorNotification(msg || response?.message || "Failed to save mapping.");
            }
        } catch (error) {
            console.error("Error saving mapping:", error);
            errorNotification("Error saving mapping.");
        } finally {
            setIsSaving(false);
        }
    };

    const getEmpLabel = (empNo) => {
        const found = employeeOptions.find(e => Number(e.value) === Number(empNo));
        return found ? found.label : `Emp #${empNo}`;
    };

    const Columns = [
        { header: 'SL', cell: (row, idx) => idx + 1, width: 40, className: 'text-center' },
        {
            header: 'Employee (Appraisee)',
            cell: (row) => getEmpLabel(row.EMPLOYEE_NO)
        },
        {
            header: 'Appraiser (Supervisor)',
            cell: (row) => getEmpLabel(row.APPRAISER_EMPLOYEE_NO)
        },
        {
            header: 'Status',
            cell: (row) => (
                <span className={`badge ${row.ACTIVE_STAT === 1 ? 'bg-success' : 'bg-danger'}`}>
                    {row.ACTIVE_STAT === 1 ? 'Active' : 'Inactive'}
                </span>
            ),
            width: 90,
            className: 'text-center'
        },
        {
            width: 80,
            cell: (row) => (
                <div className="d-flex justify-content-center gap5px">
                    <button style={{ border: "none", background: "none" }} title='EDIT' onClick={() => onEditRowClick(row)}>
                        <img src={editIcon} style={{ height: 18 }} alt="Edit" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <React.Fragment>
            <div className="page-content">
                {loading && !isShowEntryModal ? (
                    <div className='loading-overlay'>
                        <div className='spinner'></div>
                    </div>
                ) : (
                    <div className='mainDiv' style={{ minHeight: 800 }}>
                        {/* Search & Filter Header (Follows EmployeeSetup filter style) */}
                        <div className="card" style={{ padding: 10 }}>
                            <div className="row g-2 text-start">
                                <div className='col-md-4 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>KPI Reference Cycle</label>
                                            <Select
                                                options={referenceOptions}
                                                value={selectedFilterReference}
                                                styles={dropdownStyles3}
                                                onChange={(e) => {
                                                    setSelectedFilterReference(e);
                                                    if (e) fetchMappings(e.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (['Delete', 'Backspace'].includes(e.key)) { setSelectedFilterReference(null) }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-8 col-sm-12 mt-2'>
                                    <div className="row g-2 mt-2">
                                        <div className="col-12 d-flex justify-content-end gap5px">
                                            <button className="btn btn-info buttonCss gap5px" onClick={onSearchClick}>
                                                {showSearchSpinner ? (
                                                    <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                ) : (
                                                    <>
                                                        <i className="fa fa-search"></i> SEARCH
                                                    </>
                                                )}
                                            </button>

                                            <button className="btn btn-danger buttonCss" onClick={onClearFilter}>
                                                {showClearSpinner ? (
                                                    <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                ) : (
                                                    'CLEAR'
                                                )}
                                            </button>

                                            <button className="btn btn-success buttonCss" onClick={onEntryModalClick}>
                                                {showEntryModalSpinner ? (
                                                    <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                ) : (
                                                    'NEW'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List Card */}
                        <div className="card" style={{ padding: 10, marginTop: -15 }}>
                            <Table columns={Columns} data={mappingList} isLoading={loading} scroll={{ x: true, y: true }} />
                        </div>

                        {/* Modal Dialog */}
                        <div className="modal" tabIndex="-1" role="dialog"
                            style={{
                                display: isShowEntryModal ? "block" : "none",
                                position: "fixed",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                backdropFilter: "blur(5px)",
                                zIndex: 1049,
                                backgroundColor: "rgba(0, 0, 0, 0.5)"
                            }}
                        >
                            <div className="modal-dialog" role="document" style={{ maxWidth: '55%', margin: 'auto', paddingTop: 50 }}>
                                <div className="modal-content">
                                    <div className="modal-header customColorScheme">
                                        <h5 className="modal-title">
                                            <i className="fas fa-users-cog"></i> {mappingNo > 0 ? "Edit Appraiser Mapping" : "New Appraiser Mapping"}
                                        </h5>
                                        <button
                                            type="button"
                                            style={{ color: "white", backgroundColor: 'red' }}
                                            className="btn btn-close"
                                            aria-label="Close"
                                            onClick={() => setShowEntryModal(false)}
                                        />
                                    </div>

                                    <div className="modal-body" style={{ padding: 15 }}>
                                        <div className="customColorSchemeBorder" style={{ padding: 15, borderRadius: 5 }}>
                                            <div className="row g-2 text-start">
                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-3">
                                                            <label style={{ paddingTop: 3 }}>Cycle<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-9">
                                                            <Select
                                                                options={referenceOptions}
                                                                value={selectedModalReference}
                                                                styles={dropdownStyles3}
                                                                onChange={(e) => setSelectedModalReference(e)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-3">
                                                            <label style={{ paddingTop: 3 }}>Appraiser (Supervisor)<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-9">
                                                            <Select
                                                                options={employeeOptions}
                                                                value={selectedModalAppraiser}
                                                                styles={dropdownStyles3}
                                                                placeholder="Select Supervisor / Appraiser..."
                                                                onChange={(e) => {
                                                                    setSelectedModalAppraiser(e);
                                                                    // If currently selected employee(s) contains this newly selected supervisor, remove it
                                                                    if (e && selectedModalEmployee) {
                                                                        if (Array.isArray(selectedModalEmployee)) {
                                                                            setSelectedModalEmployee(selectedModalEmployee.filter(emp => emp.value !== e.value));
                                                                        } else if (selectedModalEmployee.value === e.value) {
                                                                            setSelectedModalEmployee(null);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-3">
                                                            <label style={{ paddingTop: 3 }}>Appraisee (Employee)<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-9">
                                                            <Select
                                                                isMulti={mappingNo === 0}
                                                                options={employeeOptions.filter(emp => !selectedModalAppraiser || emp.value !== selectedModalAppraiser.value)}
                                                                value={selectedModalEmployee}
                                                                styles={mappingNo === 0 ? multiSelectStyles : dropdownStyles3}
                                                                placeholder={mappingNo === 0 ? "Select Employee(s)..." : "Select Employee..."}
                                                                onChange={(e) => setSelectedModalEmployee(e)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-3">
                                                            <label style={{ paddingTop: 3 }}>Status</label>
                                                        </div>
                                                        <div className="col-9">
                                                            <Select
                                                                options={activeOptions}
                                                                value={selectedActiveStat}
                                                                styles={dropdownStyles3}
                                                                onChange={(e) => setSelectedActiveStat(e)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-2 mt-3">
                                            <div className="col-md-12 col-sm-12 d-flex justify-content-end gap5px">
                                                <button
                                                    className="btn btn-success buttonCss gap5px"
                                                    disabled={isSaving}
                                                    onClick={handleSubmit}
                                                >
                                                    {isSaving ? (
                                                        <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-save"></i> {mappingNo > 0 ? 'UPDATE' : 'SUBMIT'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </React.Fragment>
    );
}

export default KpiAppraiserMapping;

// Enterprise Performance Appraisal Module

//KPI Appraiser Mapping Setup
