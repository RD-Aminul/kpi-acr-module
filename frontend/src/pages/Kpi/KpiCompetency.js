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

function KpiCompetency() {
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
    const [competencyList, setCompetencyList] = useState([]);

    // Modal
    const [isShowEntryModal, setShowEntryModal] = useState(false);
    const [competencyNo, setCompetencyNo] = useState(0);
    const [competencyName, setCompetencyName] = useState("");
    const [description, setDescription] = useState("");

    const [activeOptions] = useState([
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' }
    ]);
    const [selectedActiveStat, setSelectedActiveStat] = useState({ value: 1, label: 'Active' });

    const [isSaving, setIsSaving] = useState(false);
    //#endregion

    useEffect(() => {
        fetchCompetencies("", -1);
    }, []);

    const fetchCompetencies = async (search, status) => {
        try {
            setLoading(true);
            const apiUrl = `KpiAcr/GetCompetencyDataList?Search=${encodeURIComponent(search || "")}`;
            const { response, status: resStatus } = await getData(apiUrl);
            if (resStatus === true && Array.isArray(response)) {
                let normalized = toUpperKeys(response).map(item => ({
                    ...item,
                    COMPETENCY_NO: item.COMPETENCY_NO || item.COMPETENCYNO || 0,
                    COMPETENCY_NAME: item.COMPETENCY_NAME || item.COMPETENCYNAME || "",
                    DESCRIPTION: item.DESCRIPTION || "",
                    ACTIVE_STAT: item.ACTIVE_STAT !== undefined ? item.ACTIVE_STAT : 1
                }));

                if (status !== undefined && status !== -1) {
                    normalized = normalized.filter(c => Number(c.ACTIVE_STAT) === Number(status));
                }
                setCompetencyList(normalized);
            } else {
                setCompetencyList([]);
            }
        } catch (error) {
            console.error("Error fetching competency list:", error);
            errorNotification("Error loading competency list");
        } finally {
            setLoading(false);
        }
    };

    const onSearchClick = async () => {
        try {
            setShowSearchSpinner(true);
            await fetchCompetencies(inputSearchValue, selectedFilterStatus?.value);
        } finally {
            setShowSearchSpinner(false);
        }
    };

    const onClearFilter = () => {
        setShowClearSpinner(true);
        setSelectedFilterStatus({ value: -1, label: 'All Status' });
        setInputSearchValue('');
        fetchCompetencies('', -1);
        setShowClearSpinner(false);
    };

    const clearModalForm = () => {
        setCompetencyNo(0);
        setCompetencyName("");
        setDescription("");
        setSelectedActiveStat({ value: 1, label: 'Active' });
    };

    const onEntryModalClick = () => {
        clearModalForm();
        setShowEntryModal(true);
    };

    const onEditRowClick = (row) => {
        setCompetencyNo(row.COMPETENCY_NO || 0);
        setCompetencyName(row.COMPETENCY_NAME || "");
        setDescription(row.DESCRIPTION || "");
        setSelectedActiveStat(activeOptions.find(o => o.value === row.ACTIVE_STAT) || { value: 1, label: 'Active' });
        setShowEntryModal(true);
    };

    const handleSubmit = async () => {
        if (isEmptyOrNull(competencyName)) {
            errorNotification("Please enter Competency Name.");
            return;
        }

        try {
            setIsSaving(true);
            const apiUrl = 'KpiAcr/SaveCompetency';
            const data = {
                CompetencyNo: competencyNo,
                CompetencyName: competencyName.trim(),
                Description: description.trim(),
                ActiveStat: Number(selectedActiveStat?.value ?? 1),
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData(apiUrl, data);
            if (status === true) {
                successNotification(response?.message || "Competency saved successfully.");
                setShowEntryModal(false);
                clearModalForm();
                fetchCompetencies(inputSearchValue, selectedFilterStatus?.value);
            } else {
                errorNotification(msg || response?.message || "Failed to save competency.");
            }
        } catch (error) {
            console.error("Error saving competency:", error);
            errorNotification("Error saving competency.");
        } finally {
            setIsSaving(false);
        }
    };

    const Columns = [
        { header: 'SL', cell: (row, idx) => idx + 1, width: 40, className: 'text-center' },
        { header: 'Competency Name', accessor: 'COMPETENCY_NAME' },
        { header: 'Description', accessor: 'DESCRIPTION' },
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
                                                placeholder="Search by Competency Name..."
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
                            <Table columns={Columns} data={competencyList} isLoading={loading} scroll={{ x: true, y: true }} />
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
                            <div className="modal-dialog" role="document" style={{ maxWidth: '50%', margin: 'auto', paddingTop: 50 }}>
                                <div className="modal-content">
                                    <div className="modal-header customColorScheme">
                                        <h5 className="modal-title">
                                            <i className="fas fa-award"></i> {competencyNo > 0 ? "Edit Competency Master" : "New Competency Master"}
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
                                                            <label style={{ paddingTop: 3 }}>Competency<span className='text-danger fw-bold'>*</span></label>
                                                        </div>
                                                        <div className="col-9">
                                                            <input
                                                                className="form-control inputHeight"
                                                                value={competencyName}
                                                                placeholder="e.g. Communication, Problem Solving"
                                                                onChange={(e) => setCompetencyName(e.target.value)}
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

                                                <div className="col-md-12 col-sm-12">
                                                    <div className="row g-2">
                                                        <div className="col-3">
                                                            <label style={{ paddingTop: 3 }}>Description</label>
                                                        </div>
                                                        <div className="col-9">
                                                            <textarea
                                                                className="form-control inputHeight"
                                                                style={{ minHeight: 70 }}
                                                                value={description}
                                                                placeholder="Description of the competency..."
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
                                                            <i className="fas fa-save"></i> {competencyNo > 0 ? 'UPDATE' : 'SUBMIT'}
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

export default KpiCompetency;

// Enterprise Performance Appraisal Module

//KPI Competency Master
