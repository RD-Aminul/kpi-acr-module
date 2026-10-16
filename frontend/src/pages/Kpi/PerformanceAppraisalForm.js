import React, { useState, useEffect, useRef } from 'react';
import { getData, postData } from 'services/ApiService';
import Select from "react-select";
import { Table } from 'components';
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import classNames from 'classnames';
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
import { isValidNumericInput } from "pages/MainMenu/CommonFiles/validations";

function PerformanceAppraisalForm() {
    //#region User Data
    debugger
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const { userName, companyName, cid, gid, ipAddress, userId, empNo } = userData;
    const currentEmpNo = toNumberOrNull(empNo);
    //#endregion

    //#region Main List States (Follows EmployeeSetup filter style)
    const [loading, setLoading] = useState(true);
    const [showSearchSpinner, setShowSearchSpinner] = useState(false);
    const [showClearSpinner, setShowClearSpinner] = useState(false);
    const [showEntryModalSpinner, setShowEntryModalSpinner] = useState(false);

    const [referenceOptions, setReferenceOptions] = useState([]);
    const [selectedFilterReference, setSelectedFilterReference] = useState(null);

    const [statusOptions] = useState([
        { value: 'DRAFT', label: 'DRAFT' },
        { value: 'EMPLOYEE_SUBMITTED', label: 'EMPLOYEE_SUBMITTED' },
        { value: 'SUPERVISOR_SUBMITTED', label: 'SUPERVISOR_SUBMITTED' },
        { value: 'RETURNED', label: 'RETURNED' },
        { value: 'FINALIZED', label: 'FINALIZED' }
    ]);
    const [selectedFilterStatus, setSelectedFilterStatus] = useState(null);
    const [inputSearchValue, setInputSearchValue] = useState('');
    const [acrMasterList, setAcrMasterList] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);

    const getEmpLabel = (empNo) => {
        if (!empNo) return '';
        const found = employeeOptions.find(e => Number(e.value) === Number(empNo));
        return found ? found.label : `Emp #${empNo}`;
    };
    //#endregion

    //#region Modal & Tab States (Follows EmployeeSetup modal/tab style)
    const [isShowEntryModal, setShowEntryModal] = useState(false);
    const [activeTab, setActiveTab] = useState("1");
    const [roleMode, setRoleMode] = useState("EMPLOYEE"); // 'EMPLOYEE' or 'SUPERVISOR'

    // Form Master Data
    const [acrNo, setAcrNo] = useState(0);
    const [submissionStatus, setSubmissionStatus] = useState("DRAFT");
    const [appraiserEmpNo, setAppraiserEmpNo] = useState(0);
    const [modalEmpNo, setModalEmpNo] = useState(currentEmpNo);
    const [selectedModalReference, setSelectedModalReference] = useState(null);

    // Section 1: Activities
    const [activities, setActivities] = useState([]);

    // Section 2: Competencies
    const [competencies, setCompetencies] = useState([]);

    // Section 3: Development Needs
    const [developmentNeeds, setDevelopmentNeeds] = useState([]);

    // Section 4: Next Year Targets
    const [nextYearTargets, setNextYearTargets] = useState([]);

    // Section 5: Supervisor Assessment
    const [supervisorPerformance, setSupervisorPerformance] = useState(null);
    const [supervisorExplanation, setSupervisorExplanation] = useState("");
    const [wholePerformance, setWholePerformance] = useState(null);
    const [supervisorRecommendation, setSupervisorRecommendation] = useState(null);
    const [supervisorRemarks, setSupervisorRemarks] = useState("");
    const [finalDecision, setFinalDecision] = useState(null);
    const [finalRemarks, setFinalRemarks] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [savingAction, setSavingAction] = useState(null); // 'DRAFT', 'SUBMIT', 'RETURN'
    //#endregion

    const ratingOptions = [
        { value: 'EXCELLENT', label: 'EXCELLENT' },
        { value: 'HIGH', label: 'HIGH' },
        { value: 'AVERAGE', label: 'AVERAGE' },
        { value: 'MARGINAL', label: 'MARGINAL' },
        { value: 'LOW', label: 'LOW' }
    ];

    const supervisorPerfOptions = [
        { value: 'HIGHLY_SATISFACTORY', label: 'Highly Satisfactory' },
        { value: 'SATISFACTORY', label: 'Satisfactory' },
        { value: 'UNSATISFACTORY', label: 'Unsatisfactory' }
    ];

    const wholePerfOptions = [
        { value: 'OUTSTANDING', label: 'Outstanding' },
        { value: 'VERY_GOOD', label: 'Very Good' },
        { value: 'GOOD', label: 'Good' },
        { value: 'ACCEPTABLE', label: 'Acceptable' },
        { value: 'POOR', label: 'Poor' }
    ];

    const finalDecisionOptions = [
        { value: 'NORMAL_INCREMENT', label: 'Normal Increment (1 Step)' },
        { value: 'SPECIAL_INCREMENT', label: 'Special Increment (2 Steps)' },
        { value: 'PROMOTION', label: 'Recommended for Promotion' },
        { value: 'NO_INCREMENT', label: 'No Increment' }
    ];

    const ratingDropdownStyles = {
        ...dropdownStyles3,
        container: (provided, state) => ({
            ...provided,
            position: 'relative',
            zIndex: state.isFocused ? 1000 : 1,
        }),
        menu: (provided, state) => ({
            ...provided,
            fontSize: "10pt",
            zIndex: 99999,
            textAlign: "left",
            width: "100%",
            minWidth: "100%",
            left: 0,
            right: 0,
            marginTop: state.placement === 'bottom' ? 2 : 0,
            marginBottom: state.placement === 'top' ? 2 : 0,
        }),
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [refRes, empRes] = await Promise.all([
                getData('KpiAcr/GetReferenceList'),
                getData(`WhDepartmentIndent/GetEmployeeList?GID=${encodeURIComponent(gid || 0)}&CID=${encodeURIComponent(cid || 0)}&CompanyNo=1`)
            ]);

            let loadedEmployees = [];
            if (empRes.status === true && Array.isArray(empRes.response)) {
                loadedEmployees = toUpperKeys(empRes.response).map(e => ({
                    value: e.EMP_NO || e.EMPLOYEE_NO,
                    label: `${e.EMPLOYEE_NAME || e.EMP_NAME} (${e.EMPLOYEE_CODE || e.EMP_CODE || e.EMP_NO})`
                }));
                setEmployeeOptions(loadedEmployees);
            }

            if (refRes.status === true && Array.isArray(refRes.response)) {
                const list = toUpperKeys(refRes.response).map(r => ({
                    value: r.REFERENCE_NO || r.REFERENCENO,
                    label: r.REFERENCE_CODE || r.REFERENCECODE
                }));
                setReferenceOptions(list);
                if (list.length > 0) {
                    setSelectedFilterReference(list[0]);
                    await fetchMasterList(list[0].value, null, '', loadedEmployees);
                }
            }
        } catch (err) {
            console.error("Error loading initial data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterList = async (refNo, statusVal, searchVal, empsList) => {
        try {
            setLoading(true);
            const emps = empsList || employeeOptions;
            const apiUrl = `KpiAcr/GetAcrMasterList?ReferenceNo=${encodeURIComponent(refNo || -1)}&Role=ALL&Status=${encodeURIComponent(statusVal || "")}`;
            const { response, status } = await getData(apiUrl);
            if (status === true && Array.isArray(response)) {
                let data = toUpperKeys(response);
                if (searchVal && searchVal.trim()) {
                    const q = searchVal.trim().toLowerCase();
                    data = data.filter(d => {
                        const empName = emps.find(e => Number(e.value) === Number(d.EMPLOYEE_NO))?.label?.toLowerCase() || '';
                        const appraiserName = emps.find(e => Number(e.value) === Number(d.APPRAISER_EMPLOYEE_NO))?.label?.toLowerCase() || '';
                        return String(d.EMPLOYEE_NO).includes(q) ||
                            empName.includes(q) ||
                            appraiserName.includes(q) ||
                            String(d.REFERENCE_CODE || "").toLowerCase().includes(q);
                    });
                }
                setAcrMasterList(data);
            } else {
                setAcrMasterList([]);
            }
        } catch (err) {
            console.error("Error fetching master list:", err);
            errorNotification("Error fetching appraisal records");
        } finally {
            setLoading(false);
        }
    };

    const onSearchClick = async () => {
        try {
            setShowSearchSpinner(true);
            await fetchMasterList(
                selectedFilterReference?.value,
                selectedFilterStatus?.value,
                inputSearchValue
            );
        } finally {
            setShowSearchSpinner(false);
        }
    };

    const onClearFilter = () => {
        setShowClearSpinner(true);
        setSelectedFilterReference(referenceOptions.length > 0 ? referenceOptions[0] : null);
        setSelectedFilterStatus(null);
        setInputSearchValue('');
        if (referenceOptions.length > 0) {
            fetchMasterList(referenceOptions[0].value, null, '');
        } else {
            setAcrMasterList([]);
        }
        setShowClearSpinner(false);
    };

    const onEntryModalClick = () => {
        if (!selectedFilterReference) {
            errorNotification("Please select a KPI Reference Cycle first.");
            return;
        }
        setRoleMode("EMPLOYEE");
        setModalEmpNo(currentEmpNo);
        setSelectedModalReference(selectedFilterReference);
        loadFormData(selectedFilterReference.value, currentEmpNo);
        setActiveTab("1");
        setShowEntryModal(true);
    };

    const onEditRowClick = (row) => {
        const refObj = referenceOptions.find(r => r.value === row.REFERENCE_NO) || { value: row.REFERENCE_NO, label: row.REFERENCE_CODE };
        setSelectedModalReference(refObj);
        setModalEmpNo(row.EMPLOYEE_NO);
        // Determine role mode: Supervisor, Employee, or HR/Admin view
        if (Number(row.APPRAISER_EMPLOYEE_NO) === Number(currentEmpNo)) {
            setRoleMode("SUPERVISOR");
        } else if (Number(row.EMPLOYEE_NO) === Number(currentEmpNo)) {
            setRoleMode("EMPLOYEE");
        } else {
            setRoleMode("HR_ADMIN");
        }
        loadFormData(row.REFERENCE_NO, row.EMPLOYEE_NO);
        setActiveTab("1");
        setShowEntryModal(true);
    };

    const loadFormData = async (refNo, targetEmpNo) => {
        try {
            setLoading(true);
            const apiUrl = `KpiAcr/GetAcrFormData?ReferenceNo=${encodeURIComponent(refNo)}&EmployeeNo=${encodeURIComponent(targetEmpNo)}`;
            const { response, status, msg } = await getData(apiUrl);
            if (status === true && response) {
                const data = response;
                setAcrNo(data.acr_no || 0);
                setSubmissionStatus(data.submission_status || "DRAFT");
                setAppraiserEmpNo(data.appraiser_employee_no || 0);

                setActivities(data.activities && data.activities.length > 0 ? data.activities : [
                    { activity_description: '', employee_achievement_percent: '', supervisor_achievement_percent: '', supervisor_comment: '', display_order: 1 }
                ]);
                setCompetencies(data.competencies || []);
                setDevelopmentNeeds(data.development_needs && data.development_needs.length > 0 ? data.development_needs : [
                    { area_to_improve: '', action_required: '', responsible_person: '', target_deadline: null, display_order: 1 }
                ]);
                setNextYearTargets(data.next_year_targets && data.next_year_targets.length > 0 ? data.next_year_targets : [
                    { target_description: '', supervisor_comment: '', display_order: 1 }
                ]);

                setSupervisorPerformance(supervisorPerfOptions.find(o => o.value === data.supervisor_performance) || null);
                setSupervisorExplanation(data.supervisor_explanation || "");
                setWholePerformance(wholePerfOptions.find(o => o.value === data.whole_performance) || null);

                const supRec = finalDecisionOptions.find(o => o.value === data.supervisor_recommendation) ||
                    finalDecisionOptions.find(o => o.value === data.final_decision) || null;
                setSupervisorRecommendation(supRec);
                setSupervisorRemarks(data.supervisor_remarks || (data.final_decision ? data.final_remarks : "") || "");

                setFinalDecision(finalDecisionOptions.find(o => o.value === data.final_decision) || null);
                setFinalRemarks(data.final_remarks || "");
            } else {
                errorNotification(msg || "Could not load appraisal form data.");
            }
        } catch (err) {
            console.error("Error loading form data:", err);
        } finally {
            setLoading(false);
        }
    };

    //#region Section 1 Activities Helpers
    const handleAddActivity = () => {
        setActivities([...activities, { activity_description: '', employee_achievement_percent: '', supervisor_achievement_percent: '', supervisor_comment: '', display_order: activities.length + 1 }]);
    };
    const handleRemoveActivity = (index) => {
        setActivities(activities.filter((_, i) => i !== index));
    };
    const handleActivityChange = (index, field, value) => {
        const updated = [...activities];
        updated[index][field] = value;
        setActivities(updated);
    };
    //#endregion

    //#region Section 2 Competencies Helpers
    const handleCompetencyRating = (index, field, value) => {
        const updated = [...competencies];
        updated[index][field] = value;
        setCompetencies(updated);
    };
    //#endregion

    //#region Section 3 Development Needs Helpers
    const handleAddDevNeed = () => {
        if (developmentNeeds.length >= 3) {
            errorNotification("Maximum 3 development needs allowed.");
            return;
        }
        setDevelopmentNeeds([...developmentNeeds, { area_to_improve: '', action_required: '', responsible_person: '', target_deadline: null, display_order: developmentNeeds.length + 1 }]);
    };
    const handleRemoveDevNeed = (index) => {
        setDevelopmentNeeds(developmentNeeds.filter((_, i) => i !== index));
    };
    const handleDevNeedChange = (index, field, value) => {
        const updated = [...developmentNeeds];
        updated[index][field] = value;
        setDevelopmentNeeds(updated);
    };
    //#endregion

    //#region Section 4 Targets Helpers
    const handleAddTarget = () => {
        setNextYearTargets([...nextYearTargets, { target_description: '', supervisor_comment: '', display_order: nextYearTargets.length + 1 }]);
    };
    const handleRemoveTarget = (index) => {
        setNextYearTargets(nextYearTargets.filter((_, i) => i !== index));
    };
    const handleTargetChange = (index, field, value) => {
        const updated = [...nextYearTargets];
        updated[index][field] = value;
        setNextYearTargets(updated);
    };
    //#endregion

    //#region Wizard Tab Navigation Helpers
    const handlePrevTab = () => {
        const cur = Number(activeTab);
        if (cur > 1) {
            setActiveTab(String(cur - 1));
        }
    };

    const handleNextTab = () => {
        const cur = Number(activeTab);
        const maxTab = (roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') ? 5 : 4;
        if (cur < maxTab) {
            setActiveTab(String(cur + 1));
        }
    };
    //#endregion

    //#region Submit Handlers
    const handleEmployeeSave = async (actionType) => {
        try {
            // Comprehensive validation before submitting to supervisor
            if (actionType === 'SUBMIT') {
                const validActivities = (activities || []).filter(a => a.activity_description && a.activity_description.trim() !== '');
                if (validActivities.length === 0) {
                    errorNotification("Please add at least one Key Activity in Section 1 before submitting.");
                    setActiveTab("1");
                    return;
                }

                const missingActPercent = validActivities.some(a => a.employee_achievement_percent === '' || a.employee_achievement_percent === null || a.employee_achievement_percent === undefined);
                if (missingActPercent) {
                    errorNotification("Please enter Employee Achievement % for all Key Activities in Section 1.");
                    setActiveTab("1");
                    return;
                }

                const unratedComp = (competencies || []).find(c => !c.employee_rating);
                if (unratedComp) {
                    errorNotification(`Please provide Self-Rating for "${unratedComp.competency_name}" in Core Competencies (Section 2).`);
                    setActiveTab("2");
                    return;
                }

                const halfFilledNeed = (developmentNeeds || []).find(d =>
                    (d.area_to_improve && !d.action_required) ||
                    (!d.area_to_improve && d.action_required)
                );
                if (halfFilledNeed) {
                    errorNotification("Please complete both 'Area to Improve' and 'Action Required' for Development Needs in Section 3.");
                    setActiveTab("3");
                    return;
                }
            }

            setIsSaving(true);
            setSavingAction(actionType);
            const payload = {
                ReferenceNo: Number(selectedModalReference?.value),
                EmployeeNo: modalEmpNo,
                AppraiserEmployeeNo: appraiserEmpNo,
                ActionType: actionType,
                ActivitiesJson: JSON.stringify(activities),
                CompetenciesJson: JSON.stringify(competencies),
                DevelopmentNeedsJson: JSON.stringify(developmentNeeds),
                TargetsJson: JSON.stringify(nextYearTargets),
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData('KpiAcr/SaveAcrEmployee', payload);
            if (status === true) {
                successNotification(response?.message || (actionType === 'SUBMIT' ? "Appraisal form submitted to supervisor successfully." : "Draft saved successfully."));
                loadFormData(selectedModalReference?.value, modalEmpNo);
                fetchMasterList(selectedFilterReference?.value, selectedFilterStatus?.value, inputSearchValue);
            } else {
                errorNotification(msg || response?.message || "Failed to save appraisal form.");
            }
        } catch (err) {
            console.error("Error saving employee appraisal:", err);
            errorNotification("Error saving appraisal form.");
        } finally {
            setIsSaving(false);
            setSavingAction(null);
        }
    };

    const handleSupervisorSave = async (actionType) => {
        try {
            if (actionType === 'SUBMIT' && !supervisorRecommendation?.value) {
                errorNotification("Please select a Supervisor Recommendation before submitting.");
                return;
            }
            setIsSaving(true);
            setSavingAction(actionType);
            const payload = {
                AcrNo: acrNo,
                ReferenceNo: Number(selectedModalReference?.value),
                EmployeeNo: modalEmpNo,
                ActionType: actionType,
                SupervisorPerformance: supervisorPerformance?.value || null,
                SupervisorExplanation: supervisorExplanation,
                WholePerformance: wholePerformance?.value || null,
                FinalDecision: supervisorRecommendation?.value || null,
                FinalRemarks: supervisorRemarks,
                ActivitiesJson: JSON.stringify(activities),
                CompetenciesJson: JSON.stringify(competencies),
                DevelopmentNeedsJson: JSON.stringify(developmentNeeds),
                TargetsJson: JSON.stringify(nextYearTargets),
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData('KpiAcr/SaveAcrSupervisor', payload);
            if (status === true) {
                successNotification(response?.message || "Supervisor evaluation saved successfully.");
                loadFormData(selectedModalReference?.value, modalEmpNo);
                fetchMasterList(selectedFilterReference?.value, selectedFilterStatus?.value, inputSearchValue);
            } else {
                errorNotification(msg || response?.message || "Failed to save evaluation.");
            }
        } catch (err) {
            console.error("Error saving supervisor appraisal:", err);
            errorNotification("Error saving evaluation.");
        } finally {
            setIsSaving(false);
            setSavingAction(null);
        }
    };
    //#endregion

    const isSubmitted = submissionStatus === 'EMPLOYEE_SUBMITTED' || submissionStatus === 'SUPERVISOR_SUBMITTED' || submissionStatus === 'FINALIZED';
    const isSupervisorSubmitted = submissionStatus === 'SUPERVISOR_SUBMITTED' || submissionStatus === 'FINALIZED';

    //#region Master Table Columns
    const masterColumns = [
        { header: "SL", cell: (row, idx) => idx + 1, width: 40, className: 'text-center' },
        { header: "Reference Cycle", accessor: "REFERENCE_CODE" },
        { header: "Employee", cell: (row) => getEmpLabel(row.EMPLOYEE_NO) },
        { header: "Appraiser", cell: (row) => getEmpLabel(row.APPRAISER_EMPLOYEE_NO) },
        {
            header: "Evaluation Period",
            cell: (row) => `${row.EVALUATION_FROM ? row.EVALUATION_FROM.substring(0, 10) : ''} to ${row.EVALUATION_TO ? row.EVALUATION_TO.substring(0, 10) : ''}`
        },
        {
            header: "Submission Status",
            cell: (row) => (
                <span className={`badge ${row.SUBMISSION_STATUS === 'FINALIZED' ? 'bg-success' :
                    row.SUBMISSION_STATUS === 'SUPERVISOR_SUBMITTED' ? 'bg-primary' :
                        row.SUBMISSION_STATUS === 'EMPLOYEE_SUBMITTED' ? 'bg-info' :
                            row.SUBMISSION_STATUS === 'RETURNED' ? 'bg-danger' : 'bg-warning'
                    }`}>
                    {row.SUBMISSION_STATUS}
                </span>
            ),
            className: 'text-center'
        },
        { header: "Final Decision", accessor: "FINAL_DECISION" },
        {
            width: 80,
            cell: (row) => {
                const isUserSupervisor = Number(row.APPRAISER_EMPLOYEE_NO) === Number(currentEmpNo);
                const isUserEmp = Number(row.EMPLOYEE_NO) === Number(currentEmpNo);
                const isLocked = (row.SUBMISSION_STATUS === 'SUPERVISOR_SUBMITTED' || row.SUBMISSION_STATUS === 'FINALIZED') ||
                    (isUserEmp && row.SUBMISSION_STATUS === 'EMPLOYEE_SUBMITTED') ||
                    (!isUserSupervisor && !isUserEmp);
                return (
                    <div className="d-flex justify-content-center gap5px">
                        <button style={{ border: "none", background: "none" }} title={isLocked ? 'VIEW' : 'EDIT'} onClick={() => onEditRowClick(row)}>
                            {isLocked ? (
                                <i className="fas fa-eye text-info" style={{ fontSize: 16 }}></i>
                            ) : (
                                <img src={editIcon} style={{ height: 18 }} alt="Edit" />
                            )}
                        </button>
                    </div>
                );
            },
        },
    ];
    //#endregion

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
                                            <label style={{ marginBottom: -3 }}>KPI Reference Cycle</label>
                                            <Select
                                                options={referenceOptions}
                                                value={selectedFilterReference}
                                                styles={dropdownStyles3}
                                                onChange={(e) => setSelectedFilterReference(e)}
                                                onKeyDown={(e) => {
                                                    if (['Delete', 'Backspace'].includes(e.key)) { setSelectedFilterReference(null) }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-3 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Submission Status</label>
                                            <Select
                                                options={statusOptions}
                                                value={selectedFilterStatus}
                                                styles={dropdownStyles3}
                                                isClearable
                                                onChange={(e) => setSelectedFilterStatus(e)}
                                                onKeyDown={(e) => {
                                                    if (['Delete', 'Backspace'].includes(e.key)) { setSelectedFilterStatus(null) }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-3 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Search</label>
                                            <input
                                                className="form-control inputHeight"
                                                value={inputSearchValue}
                                                onChange={(e) => setInputSearchValue(e.target.value)}
                                                placeholder="Search by Employee No or Reference..."
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") onSearchClick();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='col-md-3 col-sm-12 mt-2'>
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

                        {/* Master Records Table */}
                        <div className="card" style={{ padding: 10, marginTop: -15 }}>
                            <Table columns={masterColumns} data={acrMasterList} isLoading={loading} scroll={{ x: true, y: true }} />
                        </div>

                        {/* Full Screen Entry Modal (Follows EmployeeSetup modal/tab style) */}
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
                            <div className="modal-dialog" role="document" style={{ maxWidth: '95%', margin: 'auto', paddingTop: 25 }}>
                                <div className="modal-content">
                                    <div className="modal-header customColorScheme">
                                        <div className="d-flex align-items-center gap-3">
                                            <h5 className="modal-title mb-0">
                                                <i className="fas fa-file-signature"></i> Annual Performance Appraisal (ACR) Form {modalEmpNo ? ` - ${getEmpLabel(modalEmpNo)}` : ''}
                                            </h5>
                                            <span 
                                                className="badge"
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '5px 12px',
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    letterSpacing: '0.2px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                    backgroundColor:
                                                        submissionStatus === 'FINALIZED' ? '#dcfce7' :
                                                        submissionStatus === 'SUPERVISOR_SUBMITTED' ? '#ede9fe' :
                                                        submissionStatus === 'EMPLOYEE_SUBMITTED' ? '#e0f2fe' :
                                                        submissionStatus === 'RETURNED' ? '#fee2e2' : '#fef3c7',
                                                    color:
                                                        submissionStatus === 'FINALIZED' ? '#15803d' :
                                                        submissionStatus === 'SUPERVISOR_SUBMITTED' ? '#6d28d9' :
                                                        submissionStatus === 'EMPLOYEE_SUBMITTED' ? '#0369a1' :
                                                        submissionStatus === 'RETURNED' ? '#b91c1c' : '#92400e',
                                                    border:
                                                        submissionStatus === 'FINALIZED' ? '1px solid #bbf7d0' :
                                                        submissionStatus === 'SUPERVISOR_SUBMITTED' ? '1px solid #ddd6fe' :
                                                        submissionStatus === 'EMPLOYEE_SUBMITTED' ? '1px solid #bae6fd' :
                                                        submissionStatus === 'RETURNED' ? '1px solid #fecaca' : '1px solid #fde68a'
                                                }}
                                            >
                                                Status: {submissionStatus} {isSubmitted && roleMode === 'EMPLOYEE' ? '(Submitted / Locked)' : (isSupervisorSubmitted && roleMode === 'SUPERVISOR' ? '(Submitted / Locked)' : '')}
                                            </span>
                                            {roleMode === 'HR_ADMIN' && (
                                                <span className="badge bg-info text-dark" style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '12px' }}>
                                                    <i className="fas fa-eye"></i> HR Review Mode (Read-Only)
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            style={{ color: "white", backgroundColor: 'red' }}
                                            className="btn btn-close"
                                            aria-label="Close"
                                            onClick={() => { setShowEntryModal(false); onSearchClick(); }}
                                        />
                                    </div>

                                    <div className="modal-body" style={{ padding: 15 }}>
                                        {/* Styled Pill Nav Tabs (Follows EmployeeSetup tab styling) */}
                                        <Nav tabs style={{ borderBottom: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {[
                                                { id: '1', title: 'KEY ACTIVITIES' },
                                                { id: '2', title: 'CORE COMPETENCIES' },
                                                { id: '3', title: 'DEVELOPMENT NEEDS' },
                                                { id: '4', title: 'NEXT YEAR TARGETS' },
                                                ...((roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') ? [{ id: '5', title: 'SUPERVISOR DECISION' }] : [])
                                            ].map((tab) => (
                                                <NavItem key={tab.id} style={{ marginRight: 0 }}>
                                                    <NavLink
                                                        style={{
                                                            backgroundColor: activeTab === tab.id ? '#34c38f' : '#f6f6f6',
                                                            color: activeTab === tab.id ? '#fff' : '#000',
                                                            borderRadius: 20,
                                                            borderColor: '#34c38f',
                                                            padding: '4px 18px',
                                                            height: 30,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: activeTab === tab.id ? 'bold' : 'normal'
                                                        }}
                                                        className={classNames({ active: activeTab === tab.id })}
                                                        onClick={() => setActiveTab(tab.id)}
                                                    >
                                                        {tab.title}
                                                    </NavLink>
                                                </NavItem>
                                            ))}
                                        </Nav>

                                        <div className='row mt-1'>
                                            <TabContent activeTab={activeTab}>
                                                {/* TAB 1: KEY ACTIVITIES */}
                                                <TabPane tabId='1'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h5 className="mb-0">Key Activities Done in Appraisal Period</h5>
                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                                <button className="btn btn-success buttonCss btn-sm" onClick={handleAddActivity}>
                                                                    + Add Activity
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th>Description of Major Activity / Task</th>
                                                                        <th style={{ width: 170 }}>Emp. Achievement %</th>
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th style={{ width: 170 }}>Sup. Achievement %</th>}
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th>Supervisor Comments</th>}
                                                                        {roleMode === 'EMPLOYEE' && !isSubmitted && <th style={{ width: 60 }} className="text-center">Action</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {activities.map((act, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-center">{idx + 1}</td>
                                                                            <td>
                                                                                <textarea
                                                                                    className="form-control inputHeight"
                                                                                    style={{ minHeight: 40 }}
                                                                                    value={act.activity_description || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => handleActivityChange(idx, 'activity_description', e.target.value)}
                                                                                    placeholder="Enter major job task or project..."
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight text-center"
                                                                                    value={act.employee_achievement_percent || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        if (isValidNumericInput(val)) {
                                                                                            if (val === '' || Number(val) <= 100) {
                                                                                                handleActivityChange(idx, 'employee_achievement_percent', val);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    placeholder="0-100%"
                                                                                />
                                                                            </td>
                                                                            {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control inputHeight text-center"
                                                                                        value={act.supervisor_achievement_percent || ''}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            if (isValidNumericInput(val)) {
                                                                                            if (val === '' || Number(val) <= 100) {
                                                                                                handleActivityChange(idx, 'supervisor_achievement_percent', val);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    placeholder="0-100%"
                                                                                />
                                                                            </td>
                                                                        )}
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={act.supervisor_comment || ''}
                                                                                    disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                    onChange={(e) => handleActivityChange(idx, 'supervisor_comment', e.target.value)}
                                                                                    placeholder="Supervisor feedback..."
                                                                                />
                                                                            </td>
                                                                        )}
                                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                                                <td className="text-center">
                                                                                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveActivity(idx)}>
                                                                                        ✕
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 2: CORE COMPETENCIES */}
                                                <TabPane tabId='2'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <h5 className="mb-2">Core Competencies & Behavioral Assessment</h5>
                                                        <div className="table-responsive" style={{ overflow: 'visible' }}>
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th style={{ width: 220 }}>Competency Area</th>
                                                                        <th>Description</th>
                                                                        <th style={{ width: 170, minWidth: 160 }}>Self-Rating</th>
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th style={{ width: 170, minWidth: 160 }}>Supervisor Rating</th>}
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th>Supervisor Comments</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {competencies.map((comp, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-center">{idx + 1}</td>
                                                                            <td className="fw-bold">{comp.competency_name}</td>
                                                                            <td className="small text-muted">{comp.description}</td>
                                                                            <td style={{ width: 170, minWidth: 160, position: 'relative' }}>
                                                                                <Select
                                                                                    options={ratingOptions}
                                                                                    value={ratingOptions.find(o => o.value === comp.employee_rating) || null}
                                                                                    styles={ratingDropdownStyles}
                                                                                    menuPlacement="auto"
                                                                                    isDisabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    placeholder="Select Rating"
                                                                                    onChange={(selected) => handleCompetencyRating(idx, 'employee_rating', selected ? selected.value : null)}
                                                                                />
                                                                            </td>
                                                                            {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                                <td style={{ width: 170, minWidth: 160, position: 'relative' }}>
                                                                                    <Select
                                                                                        options={ratingOptions}
                                                                                        value={ratingOptions.find(o => o.value === comp.supervisor_rating) || null}
                                                                                        styles={ratingDropdownStyles}
                                                                                        menuPlacement="auto"
                                                                                        isDisabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        placeholder="Select Rating"
                                                                                        onChange={(selected) => handleCompetencyRating(idx, 'supervisor_rating', selected ? selected.value : null)}
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control inputHeight"
                                                                                        value={comp.supervisor_comment || ''}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => handleCompetencyRating(idx, 'supervisor_comment', e.target.value)}
                                                                                        placeholder="Supervisor comment..."
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 3: DEVELOPMENT NEEDS */}
                                                <TabPane tabId='3'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h5 className="mb-0">Training & Professional Development Needs (Max 3)</h5>
                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && developmentNeeds.length < 3 && (
                                                                <button className="btn btn-success buttonCss btn-sm" onClick={handleAddDevNeed}>
                                                                    + Add Need
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th>Area to Improve</th>
                                                                        <th>Action / Training Required</th>
                                                                        <th style={{ width: 170 }}>Responsible Person</th>
                                                                        <th style={{ width: 150 }}>Target Deadline</th>
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th>Supervisor Comments</th>}
                                                                        {roleMode === 'EMPLOYEE' && !isSubmitted && <th style={{ width: 60 }} className="text-center">Action</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {developmentNeeds.map((dev, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-center">{idx + 1}</td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.area_to_improve || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => handleDevNeedChange(idx, 'area_to_improve', e.target.value)}
                                                                                    placeholder="e.g. Advanced Technical Skills, Communication"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.action_required || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => handleDevNeedChange(idx, 'action_required', e.target.value)}
                                                                                    placeholder="e.g. Workshop, Online Course"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.responsible_person || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => handleDevNeedChange(idx, 'responsible_person', e.target.value)}
                                                                                    placeholder="Self / HR"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <DatePicker
                                                                                    className="form-control inputHeight"
                                                                                    selected={dev.target_deadline ? new Date(dev.target_deadline) : null}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(date) => handleDevNeedChange(idx, 'target_deadline', date === null ? null : formatedDate(date))}
                                                                                    popperClassName="custom-datepicker-popper"
                                                                                    dateFormat="dd-MM-yyyy"
                                                                                    isClearable
                                                                                    peekNextMonth
                                                                                    showMonthDropdown
                                                                                    showYearDropdown
                                                                                    dropdownMode="select"
                                                                                    placeholderText={"DD MM YYYY"}
                                                                                />
                                                                            </td>
                                                                            {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control inputHeight"
                                                                                        value={dev.supervisor_comment || ''}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => handleDevNeedChange(idx, 'supervisor_comment', e.target.value)}
                                                                                        placeholder="Supervisor comment..."
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                                                <td className="text-center">
                                                                                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDevNeed(idx)}>
                                                                                        ✕
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 4: NEXT YEAR TARGETS */}
                                                <TabPane tabId='4'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h5 className="mb-0">Key Targets & Performance Goals for the Coming Year</h5>
                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                                <button className="btn btn-success buttonCss btn-sm" onClick={handleAddTarget}>
                                                                    + Add Target
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th>Target Description / Goal Objective</th>
                                                                        {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && <th>Supervisor Comments</th>}
                                                                        {roleMode === 'EMPLOYEE' && !isSubmitted && <th style={{ width: 60 }} className="text-center">Action</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {nextYearTargets.map((tgt, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-center">{idx + 1}</td>
                                                                            <td>
                                                                                <textarea
                                                                                    className="form-control inputHeight"
                                                                                    style={{ minHeight: 40 }}
                                                                                    value={tgt.target_description || ''}
                                                                                    disabled={roleMode !== 'EMPLOYEE' || isSubmitted}
                                                                                    onChange={(e) => handleTargetChange(idx, 'target_description', e.target.value)}
                                                                                    placeholder="Enter targeted project outcome..."
                                                                                />
                                                                            </td>
                                                                            {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control inputHeight"
                                                                                        value={tgt.supervisor_comment || ''}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => handleTargetChange(idx, 'supervisor_comment', e.target.value)}
                                                                                        placeholder="Supervisor remarks..."
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                                                <td className="text-center">
                                                                                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveTarget(idx)}>
                                                                                        ✕
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 5: SUPERVISOR EVALUATION & RECOMMENDATIONS */}
                                                {(roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') && (
                                                    <TabPane tabId='5'>
                                                        <div className="mt-3">
                                                            {/* Section 5-A: Supervisor Assessment & Recommendation */}
                                                            <div className="card mb-3 customColorSchemeBorder" style={{ borderRadius: 6 }}>
                                                                <div className="card-header py-2" style={{ backgroundColor: '#f0f4f8' }}>
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <h6 className="mb-0 text-primary fw-bold" style={{ fontSize: '13px' }}>
                                                                            <i className="fas fa-user-tie me-2"></i> Section A: Supervisor Assessment & Recommendation
                                                                        </h6>
                                                                        {isSupervisorSubmitted ? (
                                                                            <span className="badge bg-secondary" style={{ fontSize: '10px' }}>
                                                                                <i className="fas fa-lock me-1"></i> Locked (Submitted)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-info text-dark" style={{ fontSize: '10px' }}>
                                                                                <i className="fas fa-edit me-1"></i> Supervisor Editable
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="card-body p-3">
                                                                    <div className="row g-3">
                                                                        <div className="col-md-6 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-4">
                                                                                    <label style={{ paddingTop: 3 }}>Supervisor Assessment</label>
                                                                                </div>
                                                                                <div className="col-8">
                                                                                    <Select
                                                                                        options={supervisorPerfOptions}
                                                                                        value={supervisorPerformance}
                                                                                        styles={dropdownStyles3}
                                                                                        isDisabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        placeholder="Select Performance"
                                                                                        onChange={(selected) => setSupervisorPerformance(selected)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-4">
                                                                                    <label style={{ paddingTop: 3 }}>Overall Grade</label>
                                                                                </div>
                                                                                <div className="col-8">
                                                                                    <Select
                                                                                        options={wholePerfOptions}
                                                                                        value={wholePerformance}
                                                                                        styles={dropdownStyles3}
                                                                                        isDisabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        placeholder="Select Grade"
                                                                                        onChange={(selected) => setWholePerformance(selected)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-12 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-2">
                                                                                    <label style={{ paddingTop: 3 }}>Supervisor Explanation</label>
                                                                                </div>
                                                                                <div className="col-10">
                                                                                    <textarea
                                                                                        className="form-control inputHeight"
                                                                                        style={{ minHeight: 65 }}
                                                                                        value={supervisorExplanation}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => setSupervisorExplanation(e.target.value)}
                                                                                        placeholder="Detailed rationale for appraisal ratings..."
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-4">
                                                                                    <label style={{ paddingTop: 3 }} className="text-primary fw-bold">Supervisor Recommendation</label>
                                                                                </div>
                                                                                <div className="col-8">
                                                                                    <Select
                                                                                        options={finalDecisionOptions}
                                                                                        value={supervisorRecommendation}
                                                                                        styles={dropdownStyles3}
                                                                                        isDisabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        placeholder="Select Recommendation (Increment / Promotion)"
                                                                                        onChange={(selected) => setSupervisorRecommendation(selected)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-3">
                                                                                    <label style={{ paddingTop: 3 }} className="text-primary fw-bold">Supervisor Remarks</label>
                                                                                </div>
                                                                                <div className="col-9">
                                                                                    <input
                                                                                        className="form-control inputHeight"
                                                                                        value={supervisorRemarks}
                                                                                        disabled={roleMode === 'HR_ADMIN' || isSupervisorSubmitted}
                                                                                        onChange={(e) => setSupervisorRemarks(e.target.value)}
                                                                                        placeholder="Supervisor recommendation remarks or notes..."
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Section 5-B: HR & Management Committee Final Decision (Shown if finalized or HR decision exists) */}
                                                            {(submissionStatus === 'FINALIZED' || finalDecision) && (
                                                                <div className="card mb-3 customColorSchemeBorder" style={{ borderRadius: 6 }}>
                                                                    <div className="card-header py-2" style={{ backgroundColor: '#f0fdf4' }}>
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <h6 className="mb-0 text-success fw-bold" style={{ fontSize: '13px' }}>
                                                                                <i className="fas fa-gavel me-2"></i> Section B: HR & Management Committee Final Decision
                                                                            </h6>
                                                                            {submissionStatus === 'FINALIZED' && (
                                                                                <span className="badge bg-success" style={{ fontSize: '10px' }}>
                                                                                    <i className="fas fa-check-circle me-1"></i> FINALIZED & APPROVED
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="card-body p-3">
                                                                        <div className="row g-3">
                                                                            <div className="col-md-6 col-sm-12">
                                                                                <div className="row g-2">
                                                                                <div className="col-4">
                                                                                    <label style={{ paddingTop: 3 }} className="text-success fw-bold">HR Final Decision</label>
                                                                                </div>
                                                                                <div className="col-8">
                                                                                    <Select
                                                                                        options={finalDecisionOptions}
                                                                                        value={finalDecision}
                                                                                        styles={dropdownStyles3}
                                                                                        isDisabled={true}
                                                                                        placeholder="Select Decision"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6 col-sm-12">
                                                                            <div className="row g-2">
                                                                                <div className="col-3">
                                                                                    <label style={{ paddingTop: 3 }} className="text-success fw-bold">HR Remarks</label>
                                                                                </div>
                                                                                <div className="col-9">
                                                                                    <input
                                                                                        className="form-control inputHeight"
                                                                                        value={finalRemarks || ''}
                                                                                        disabled={true}
                                                                                        placeholder="HR Committee Remarks"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    </TabPane>
                                                )}
                                            </TabContent>
                                        </div>

                                        {/* Modal Footer with Wizard Navigation */}
                                        <div className="row g-2 mt-3 pt-2" style={{ borderTop: '1px solid #dee2e6' }}>
                                            <div className="col-6 d-flex justify-content-start gap5px">
                                                {Number(activeTab) > 1 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary buttonCss gap5px"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={handlePrevTab}
                                                    >
                                                        <i className="fas fa-chevron-left"></i> PREVIOUS
                                                    </button>
                                                )}
                                            </div>

                                            <div className="col-6 d-flex justify-content-end align-items-center gap5px">
                                                {/* HR / Admin View Mode Badge */}
                                                {roleMode === 'HR_ADMIN' && (
                                                    <span className="badge bg-info text-dark" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-eye"></i> HR REVIEW MODE (READ ONLY)
                                                    </span>
                                                )}

                                                {/* Locked badge if supervisor evaluation already submitted */}
                                                {roleMode === 'SUPERVISOR' && isSupervisorSubmitted && (
                                                    <span className="badge bg-success" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-lock"></i> EVALUATION SUBMITTED (LOCKED)
                                                    </span>
                                                )}

                                                {/* Locked badge if employee already submitted */}
                                                {roleMode === 'EMPLOYEE' && isSubmitted && (
                                                    <span className="badge bg-info text-dark" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-lock"></i> SUBMITTED (LOCKED)
                                                    </span>
                                                )}

                                                {/* SAVE DRAFT - Available on any tab for Employee */}
                                                {roleMode === 'EMPLOYEE' && !isSubmitted && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger buttonCss"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={() => handleEmployeeSave('DRAFT')}
                                                        title="Save work as draft"
                                                    >
                                                        {savingAction === 'DRAFT' ? <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} /> : 'SAVE DRAFT'}
                                                    </button>
                                                )}

                                                {/* SAVE EVALUATION (Supervisor Draft) - Available on any tab for Supervisor when not submitted */}
                                                {roleMode === 'SUPERVISOR' && !isSupervisorSubmitted && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger buttonCss"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={() => handleSupervisorSave('DRAFT')}
                                                        title="Save evaluation as draft"
                                                    >
                                                        {savingAction === 'DRAFT' ? <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} /> : 'SAVE EVALUATION'}
                                                    </button>
                                                )}

                                                {/* NEXT button - Navigate to next tab if not on the final tab */}
                                                {Number(activeTab) < ((roleMode === 'SUPERVISOR' || roleMode === 'HR_ADMIN') ? 5 : 4) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary buttonCss gap5px"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={handleNextTab}
                                                    >
                                                        NEXT <i className="fas fa-chevron-right"></i>
                                                    </button>
                                                )}

                                                {/* SUBMIT TO SUPERVISOR - Only on the Final Tab (Tab 4) for Employee */}
                                                {roleMode === 'EMPLOYEE' && !isSubmitted && activeTab === '4' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-success buttonCss gap5px"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={() => handleEmployeeSave('SUBMIT')}
                                                    >
                                                        {savingAction === 'SUBMIT' ? (
                                                            <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-paper-plane"></i> SUBMIT TO SUPERVISOR
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Supervisor Actions - Only on Tab 5 for Supervisor when not submitted */}
                                                {roleMode === 'SUPERVISOR' && !isSupervisorSubmitted && activeTab === '5' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-warning buttonCss"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleSupervisorSave('RETURN')}
                                                        >
                                                            {savingAction === 'RETURN' ? <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} /> : 'RETURN TO EMPLOYEE'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-success buttonCss gap5px"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleSupervisorSave('SUBMIT')}
                                                        >
                                                            {savingAction === 'SUBMIT' ? (
                                                                <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-check-circle"></i> FINALIZE EVALUATION
                                                                </>
                                                            )}
                                                        </button>
                                                    </>
                                                )}
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

export default PerformanceAppraisalForm;

// Enterprise Performance Appraisal Module

//Annual Performance Appraisal (ACR) Form
