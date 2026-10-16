import React, { useState, useEffect, useRef } from 'react';
import { getData, postData } from 'services/ApiService';
import Select from "react-select";
import { Table } from 'components';
import loadingIcon from "assets/images/MainPhoto/loadingIcon.gif";
import editIcon from "assets/images/MainPhoto/editIcon.png";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    successNotification,
    errorNotification,
    dropdownStyles3,
    toStringOrNull,
    formatedDate,
    toStringOrEmpty,
    toNumberOrNull,
    toUpperKeys,
    isEmptyOrNull
} from "pages/MainMenu/CommonFiles/utilities";

function KpiReference() {
    //#region User Data
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const { userId, ipAddress } = userData;
    //#endregion

    //#region State
    const [loading, setLoading] = useState(true);
    const [showSearchSpinner, setShowSearchSpinner] = useState(false);
    const [showClearSpinner, setShowClearSpinner] = useState(false);
    const [showEntryModalSpinner, setShowEntryModalSpinner] = useState(false);

    const [statusOptions] = useState([
        { value: -1, label: 'All Status' },
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' }
    ]);
    const [selectedFilterStatus, setSelectedFilterStatus] = useState({ value: -1, label: 'All Status' });
    const [inputSearchValue, setInputSearchValue] = useState('');
    const [referenceList, setReferenceList] = useState([]);

    // Modal
    const [isShowEntryModal, setShowEntryModal] = useState(false);
    const [referenceNo, setReferenceNo] = useState(0);
    const [referenceCode, setReferenceCode] = useState("");
    const [selectedEvalFrom, setSelectedEvalFrom] = useState(null);
    const [selectedEvalTo, setSelectedEvalTo] = useState(null);
    const [selectedEmpDueDate, setSelectedEmpDueDate] = useState(null);
    const [selectedSupDueDate, setSelectedSupDueDate] = useState(null);
    const [description, setDescription] = useState("");

    const [cycleStatusOptions] = useState([
        { value: 'DRAFT', label: 'DRAFT' },
        { value: 'OPEN', label: 'OPEN' },
        { value: 'CLOSED', label: 'CLOSED' }
    ]);
    const [selectedCycleStatus, setSelectedCycleStatus] = useState({ value: 'DRAFT', label: 'DRAFT' });

    const [activeOptions] = useState([
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' }
    ]);
    const [selectedActiveStat, setSelectedActiveStat] = useState({ value: 1, label: 'Active' });

    const [isSaving, setIsSaving] = useState(false);
    //#endregion

    useEffect(() => {
        fetchReferences("", -1);
    }, []);

    const fetchReferences = async (search, status) => {
        try {
            setLoading(true);
            const apiUrl = `KpiAcr/GetReferenceDataList?Search=${encodeURIComponent(search || "")}&ActiveStat=${encodeURIComponent(status !== undefined ? status : -1)}`;
            const { response, status: resStatus } = await getData(apiUrl);
            if (resStatus === true && Array.isArray(response)) {
                const normalized = toUpperKeys(response).map(item => ({
                    ...item,
                    REFERENCE_NO: item.REFERENCE_NO || item.REFERENCENO || 0,
                    REFERENCE_CODE: item.REFERENCE_CODE || item.REFERENCECODE || "",
                    EVALUATION_FROM: item.EVALUATION_FROM ? item.EVALUATION_FROM.substring(0, 10) : "",
                    EVALUATION_TO: item.EVALUATION_TO ? item.EVALUATION_TO.substring(0, 10) : "",
                    EMPLOYEE_DUE_DATE: item.EMPLOYEE_DUE_DATE ? item.EMPLOYEE_DUE_DATE.substring(0, 10) : "",
                    SUPERVISOR_DUE_DATE: item.SUPERVISOR_DUE_DATE ? item.SUPERVISOR_DUE_DATE.substring(0, 10) : "",
                    CYCLE_STATUS: item.CYCLE_STATUS || "DRAFT",
                    ACTIVE_STAT: item.ACTIVE_STAT !== undefined ? item.ACTIVE_STAT : 1
                }));
                setReferenceList(normalized);
            } else {
                setReferenceList([]);
            }
        } catch (error) {
            console.error("Error fetching reference list:", error);
            errorNotification("Error loading KPI reference list");
        } finally {
            setLoading(false);
        }
    };

    const onSearchClick = async () => {
        try {
            setShowSearchSpinner(true);
            await fetchReferences(inputSearchValue, selectedFilterStatus?.value);
        } finally {
            setShowSearchSpinner(false);
        }
    };

    const onClearFilter = () => {
        setShowClearSpinner(true);
        setSelectedFilterStatus({ value: -1, label: 'All Status' });
        setInputSearchValue('');
        fetchReferences('', -1);
        setShowClearSpinner(false);
    };

    const clearModalForm = () => {
        setReferenceNo(0);
        setReferenceCode("");
        setSelectedEvalFrom(null);
        setSelectedEvalTo(null);
        setSelectedEmpDueDate(null);
        setSelectedSupDueDate(null);
        setDescription("");
        setSelectedCycleStatus({ value: 'DRAFT', label: 'DRAFT' });
        setSelectedActiveStat({ value: 1, label: 'Active' });
    };

    const onEntryModalClick = () => {
        clearModalForm();
        setShowEntryModal(true);
    };

    const onEditRowClick = (row) => {
        setReferenceNo(row.REFERENCE_NO || 0);
        setReferenceCode(row.REFERENCE_CODE || "");
        setSelectedEvalFrom(row.EVALUATION_FROM ? new Date(row.EVALUATION_FROM) : null);
        setSelectedEvalTo(row.EVALUATION_TO ? new Date(row.EVALUATION_TO) : null);
        setSelectedEmpDueDate(row.EMPLOYEE_DUE_DATE ? new Date(row.EMPLOYEE_DUE_DATE) : null);
        setSelectedSupDueDate(row.SUPERVISOR_DUE_DATE ? new Date(row.SUPERVISOR_DUE_DATE) : null);
        setDescription(row.DESCRIPTION || "");
        setSelectedCycleStatus(cycleStatusOptions.find(o => o.value === row.CYCLE_STATUS) || { value: 'DRAFT', label: 'DRAFT' });
        setSelectedActiveStat(activeOptions.find(o => o.value === row.ACTIVE_STAT) || { value: 1, label: 'Active' });
        setShowEntryModal(true);
    };

    const handleSubmit = async () => {
        if (isEmptyOrNull(referenceCode)) {
            errorNotification("Please enter Reference Code.");
            return;
        }
        if (!selectedEvalFrom || !selectedEvalTo || !selectedEmpDueDate) {
            errorNotification("Evaluation period and Employee Due Date are required.");
            return;
        }

        try {
            setIsSaving(true);
            const apiUrl = 'KpiAcr/SaveReference';
            const data = {
                ReferenceNo: referenceNo,
                ReferenceCode: referenceCode.trim(),
                EvaluationFrom: selectedEvalFrom ? formatedDate(selectedEvalFrom) : null,
                EvaluationTo: selectedEvalTo ? formatedDate(selectedEvalTo) : null,
                EmployeeDueDate: selectedEmpDueDate ? formatedDate(selectedEmpDueDate) : null,
                SupervisorDueDate: selectedSupDueDate ? formatedDate(selectedSupDueDate) : null,
                Description: description.trim(),
                ActiveStat: Number(selectedActiveStat?.value ?? 1),
                CycleStatus: selectedCycleStatus?.value || "DRAFT",
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData(apiUrl, data);
            if (status === true) {
                successNotification(response?.message);
                setShowEntryModal(false);
                clearModalForm();
                fetchReferences(inputSearchValue, selectedFilterStatus?.value);
            } else {
                errorNotification(msg || response?.message);
            }
        } catch (error) {
            console.error("Error saving reference:", error);
            errorNotification("Error saving KPI reference.");
        } finally {
            setIsSaving(false);
        }
    };

    const Columns = [
        { header: 'SL', cell: (row, idx) => idx + 1, width: 40, className: 'text-center' },
        { header: 'Reference Code', accessor: 'REFERENCE_CODE' },
        { header: 'Evaluation From', accessor: 'EVALUATION_FROM' },
        { header: 'Evaluation To', accessor: 'EVALUATION_TO' },
        { header: 'Emp. Due Date', accessor: 'EMPLOYEE_DUE_DATE' },
        { header: 'Sup. Due Date', accessor: 'SUPERVISOR_DUE_DATE' },
        {
            header: 'Cycle Status',
            cell: (row) => {
                let badgeClass = 'bg-secondary';
                if (row.CYCLE_STATUS === 'OPEN') badgeClass = 'bg-success';
                else if (row.CYCLE_STATUS === 'CLOSED') badgeClass = 'bg-dark';
                return <span className={`badge ${badgeClass}`}>{row.CYCLE_STATUS}</span>;
            },
            width: 100,
            className: 'text-center'
        },
        {
            header: 'Active',
            cell: (row) => (
                <span className={`badge ${row.ACTIVE_STAT === 1 ? 'bg-primary' : 'bg-danger'}`}>
                    {row.ACTIVE_STAT === 1 ? 'Active' : 'Inactive'}
                </span>
            ),
            width: 80,
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
                                <div className='col-md-3 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Status</label>
                                            <Select
                                                options={statusOptions}
                                                value={selectedFilterStatus}
                                                styles={dropdownStyles3}
                                                onChange={(e) => setSelectedFilterStatus(e)}
                                                onKeyDown={(e) => {
                                                    if (['Delete', 'Backspace'].includes(e.key)) { setSelectedFilterStatus(null) }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-4 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Search</label>
                                            <input
                                                className="form-control inputHeight"
                                                value={inputSearchValue}
                                                onChange={(e) => setInputSearchValue(e.target.value)}
                                                placeholder="Search by Reference Code..."
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") onSearchClick();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-5 col-sm-12 mt-2'>
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
                            <Table columns={Columns} data={referenceList} isLoading={loading} scroll={{ x: true, y: true }} />
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
                            <div className="modal-dialog" role="document" style={{ maxWidth: '60%', margin: 'auto', paddingTop: 50 }}>
                                <div className="modal-content">
                                    <div className="modal-header customColorScheme">
                                        <h5 className="modal-title">
                                            <i className="fas fa-calendar-alt"></i> {referenceNo > 0 ? "Edit KPI Reference Cycle" : "New KPI Reference Cycle"}
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
                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Ref. Code<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-8">
                                                            <input
                                                                className="form-control inputHeight"
                                                                value={referenceCode}
                                                                placeholder="e.g. ACR-2026"
                                                                onChange={(e) => setReferenceCode(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Cycle Status</label>
                                                        </div>
                                                        <div className="col-8">
                                                            <Select
                                                                options={cycleStatusOptions}
                                                                value={selectedCycleStatus}
                                                                styles={dropdownStyles3}
                                                                onChange={(e) => setSelectedCycleStatus(e)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Eval. From<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-8">
                                                            <DatePicker
                                                                className="form-control inputHeight"
                                                                selected={selectedEvalFrom}
                                                                onChange={(date) => setSelectedEvalFrom(date === null ? null : formatedDate(date))}
                                                                popperClassName="custom-datepicker-popper"
                                                                dateFormat="dd-MM-yyyy"
                                                                isClearable
                                                                peekNextMonth
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                placeholderText={"DD MM YYYY"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Eval. To<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-8">
                                                            <DatePicker
                                                                className="form-control inputHeight"
                                                                selected={selectedEvalTo}
                                                                onChange={(date) => setSelectedEvalTo(date === null ? null : formatedDate(date))}
                                                                popperClassName="custom-datepicker-popper"
                                                                dateFormat="dd-MM-yyyy"
                                                                isClearable
                                                                peekNextMonth
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                placeholderText={"DD MM YYYY"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Emp. Due Date<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-8">
                                                            <DatePicker
                                                                className="form-control inputHeight"
                                                                selected={selectedEmpDueDate}
                                                                onChange={(date) => setSelectedEmpDueDate(date === null ? null : formatedDate(date))}
                                                                popperClassName="custom-datepicker-popper"
                                                                dateFormat="dd-MM-yyyy"
                                                                isClearable
                                                                peekNextMonth
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                placeholderText={"DD MM YYYY"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Sup. Due Date</label>
                                                        </div>
                                                        <div className="col-8">
                                                            <DatePicker
                                                                className="form-control inputHeight"
                                                                selected={selectedSupDueDate}
                                                                onChange={(date) => setSelectedSupDueDate(date === null ? null : formatedDate(date))}
                                                                popperClassName="custom-datepicker-popper"
                                                                dateFormat="dd-MM-yyyy"
                                                                isClearable
                                                                peekNextMonth
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                placeholderText={"DD MM YYYY"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <label style={{ paddingTop: 3 }}>Active Status</label>
                                                        </div>
                                                        <div className="col-8">
                                                            <Select
                                                                options={activeOptions}
                                                                value={selectedActiveStat}
                                                                styles={dropdownStyles3}
                                                                onChange={(e) => setSelectedActiveStat(e)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-2">
                                                            <label style={{ paddingTop: 3 }}>Description</label>
                                                        </div>
                                                        <div className="col-10">
                                                            <textarea
                                                                className="form-control inputHeight"
                                                                style={{ minHeight: 60 }}
                                                                value={description}
                                                                placeholder="Cycle remarks or instructions..."
                                                                onChange={(e) => setDescription(e.target.value)}
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
                                                            <i className="fas fa-save"></i> {referenceNo > 0 ? 'UPDATE' : 'SUBMIT'}
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

export default KpiReference;

// Enterprise Performance Appraisal Module

//KPI Reference Setup
