import React, { useState, useEffect } from 'react';
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
    isEmptyOrNull,
    toIntegerOrNull,
    formatedDateYYYYMMDD
} from "pages/MainMenu/CommonFiles/utilities";
import { isValidNumericInput } from "pages/MainMenu/CommonFiles/validations";

function AcrApprovalList() {
    //#region User Data
    debugger
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const { userId, ipAddress, empNo, cid, gid, userName, userType, isAdmin, isadmin } = userData;
    const currentEmpNo = toNumberOrNull(empNo) || toNumberOrNull(userId) || 0;

    const isAdminUser = 
        String(userId || "").toLowerCase() === 'admin' ||
        String(userName || "").toLowerCase().includes('admin') ||
        String(userType || "").toUpperCase() === 'ADMIN' ||
        String(userType || "").toUpperCase() === 'SUPERADMIN' ||
        String(userType || "").toUpperCase() === 'HR' ||
        isAdmin === 1 ||
        isAdmin === true ||
        isadmin === 1 ||
        isadmin === true;
    //#endregion

    //#region List States
    const [loading, setLoading] = useState(true);
    const [showSearchSpinner, setShowSearchSpinner] = useState(false);
    const [showClearSpinner, setShowClearSpinner] = useState(false);

    const [referenceOptions, setReferenceOptions] = useState([]);
    const [selectedFilterReference, setSelectedFilterReference] = useState(null);

    const viewScopeOptions = [
        { value: 'ALL', label: 'All Employees (HR / Admin View)' },
        { value: 'SUPERVISOR', label: 'My Supervisees Only (Supervisor View)' }
    ];
    const [selectedViewScope, setSelectedViewScope] = useState(
        isAdminUser ? viewScopeOptions[0] : viewScopeOptions[1]
    );

    const [statusOptions] = useState([
        { value: 'ALL', label: 'All Status' },
        { value: 'EMPLOYEE_SUBMITTED', label: 'Pending for Review (Submitted)' },
        { value: 'SUPERVISOR_SUBMITTED', label: 'Supervisor Evaluated' },
        { value: 'RETURNED', label: 'Returned to Employee' },
        { value: 'FINALIZED', label: 'Finalized / Approved' }
    ]);
    const [selectedFilterStatus, setSelectedFilterStatus] = useState(
        isAdminUser ? { value: 'ALL', label: 'All Status' } : { value: 'EMPLOYEE_SUBMITTED', label: 'Pending for Review (Submitted)' }
    );
    const [inputSearchValue, setInputSearchValue] = useState('');
    const [reviewList, setReviewList] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);

    const getEmpLabel = (empNo) => {
        if (!empNo) return '';
        const found = employeeOptions.find(e => Number(e.value) === Number(empNo));
        return found ? found.label : `Emp #${empNo}`;
    };
    //#endregion

    //#region Review Modal States
    const [isShowReviewModal, setShowReviewModal] = useState(false);
    const [activeTab, setActiveTab] = useState("1");

    // Modal Details
    const [selectedRow, setSelectedRow] = useState(null);
    const [acrNo, setAcrNo] = useState(0);
    const [submissionStatus, setSubmissionStatus] = useState("");
    const [appraiseeEmpNo, setAppraiseeEmpNo] = useState(0);

    // Section 1: Activities
    const [activities, setActivities] = useState([]);

    // Section 2: Competencies
    const [competencies, setCompetencies] = useState([]);

    // Section 3: Development Needs
    const [developmentNeeds, setDevelopmentNeeds] = useState([]);

    // Section 4: Targets
    const [nextYearTargets, setNextYearTargets] = useState([]);

    // Section 5: Supervisor Assessment
    const [supervisorPerformance, setSupervisorPerformance] = useState(null);
    const [supervisorExplanation, setSupervisorExplanation] = useState("");
    const [wholePerformance, setWholePerformance] = useState(null);
    const [supervisorRecommendation, setSupervisorRecommendation] = useState(null);
    const [supervisorRemarks, setSupervisorRemarks] = useState("");
    const [finalDecision, setFinalDecision] = useState(null);
    const [finalRemarks, setFinalRemarks] = useState("");
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [finalizedBy, setFinalizedBy] = useState(null);
    const [finalizedAt, setFinalizedAt] = useState(null);
    const [effectiveDate, setEffectiveDate] = useState(null);
    const [promotedDesignation, setPromotedDesignation] = useState(null);
    const [designationOptions, setDesignationOptions] = useState([]);
    const [incrementTypeOptions, setIncrementTypeOptions] = useState([]);
    const [selectedIncrementType, setSelectedIncrementType] = useState(null);

    const [isSaving, setIsSaving] = useState(false);
    const [savingAction, setSavingAction] = useState(null); // 'DRAFT', 'SUBMIT', 'RETURN', 'FINALIZE', 'RETURN_TO_SUPERVISOR'
    //#endregion

    const ratingOptions = [
        { value: 'EXCELLENT', label: 'EXCELLENT' },
        { value: 'HIGH', label: 'HIGH' },
        { value: 'AVERAGE', label: 'AVERAGE' },
        { value: 'MARGINAL', label: 'MARGINAL' },
        { value: 'LOW', label: 'LOW' }
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
                    const initialStatus = isAdminUser ? 'ALL' : 'EMPLOYEE_SUBMITTED';
                    const initialScope = isAdminUser ? 'ALL' : 'SUPERVISOR';
                    await fetchReviewList(list[0].value, initialStatus, '', loadedEmployees, initialScope);
                }
            }

            try {
                const [desigRes, incRes] = await Promise.all([
                    getData(`EmployeePromotion/GetDesignationWithGradeList?GID=${encodeURIComponent(gid || 0)}&CID=${encodeURIComponent(cid || 0)}`),
                    getData('EmployeeIncrement/GetIncrementTypeList')
                ]);
                if (desigRes.status === true && Array.isArray(desigRes.response)) {
                    const dList = desigRes.response.map(obj => ({
                        value: obj.jobtitle_no || obj.JOBTITLE_NO,
                        label: `${obj.jobtitle_name || obj.JOBTITLE_NAME} (${obj.grade_name || obj.GRADE_NAME || 'Grade N/A'})`
                    }));
                    setDesignationOptions(dList);
                }
                if (incRes.status === true && Array.isArray(incRes.response)) {
                    const iList = toUpperKeys(incRes.response).map(obj => ({
                        value: obj.INCREMENT_TYPE_NO,
                        label: obj.INCREMENT_TYPE_NAME
                    }));
                    setIncrementTypeOptions(iList);
                    if (iList.length > 0) setSelectedIncrementType(iList[0]);
                }
            } catch (loadErr) {
                console.error("Error loading designation or increment options:", loadErr);
            }
        } catch (err) {
            console.error("Error loading initial data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewList = async (refNo, statusVal, searchVal, empsList, scopeVal) => {
        try {
            setLoading(true);
            const emps = empsList || employeeOptions;
            const st = (statusVal === 'ALL' || !statusVal) ? '' : statusVal;

            const activeScope = scopeVal || selectedViewScope?.value || (isAdminUser ? 'ALL' : 'SUPERVISOR');
            const isAllScope = activeScope === 'ALL';
            const roleParam = isAllScope ? 'ALL' : 'SUPERVISOR';
            const empNoParam = isAllScope ? -1 : currentEmpNo;

            // Fetch records: for Admin (Role=ALL, returns all company appraisals) or Supervisor (Role=SUPERVISOR, supervisees only)
            const apiUrl = `KpiAcr/GetAcrMasterList?ReferenceNo=${encodeURIComponent(refNo || -1)}&EmployeeNo=${encodeURIComponent(empNoParam)}&Role=${encodeURIComponent(roleParam)}&Status=${encodeURIComponent(st)}`;
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
                setReviewList(data);
            } else {
                setReviewList([]);
            }
        } catch (err) {
            console.error("Error fetching review list:", err);
            errorNotification("Error fetching appraisal review records");
        } finally {
            setLoading(false);
        }
    };

    const onSearchClick = async () => {
        try {
            setShowSearchSpinner(true);
            await fetchReviewList(
                selectedFilterReference?.value,
                selectedFilterStatus?.value,
                inputSearchValue,
                employeeOptions,
                selectedViewScope?.value
            );
        } finally {
            setShowSearchSpinner(false);
        }
    };

    const onClearFilter = () => {
        setShowClearSpinner(true);
        setSelectedFilterReference(referenceOptions.length > 0 ? referenceOptions[0] : null);
        const defaultStatus = isAdminUser ? { value: 'ALL', label: 'All Status' } : { value: 'EMPLOYEE_SUBMITTED', label: 'Pending for Review (Submitted)' };
        setSelectedFilterStatus(defaultStatus);
        const defaultScope = isAdminUser ? viewScopeOptions[0] : viewScopeOptions[1];
        setSelectedViewScope(defaultScope);
        setInputSearchValue('');
        if (referenceOptions.length > 0) {
            fetchReviewList(referenceOptions[0].value, defaultStatus.value, '', employeeOptions, defaultScope.value);
        } else {
            setReviewList([]);
        }
        setShowClearSpinner(false);
    };

    const onOpenReviewModal = async (row) => {
        setSelectedRow(row);
        setAppraiseeEmpNo(row.EMPLOYEE_NO);
        try {
            setLoading(true);
            const apiUrl = `KpiAcr/GetAcrFormData?ReferenceNo=${encodeURIComponent(row.REFERENCE_NO)}&EmployeeNo=${encodeURIComponent(row.EMPLOYEE_NO)}`;
            const { response, status, msg } = await getData(apiUrl);
            if (status === true && response) {
                const data = response;
                setAcrNo(data.acr_no || row.ACR_NO || 0);
                setSubmissionStatus(data.submission_status || row.SUBMISSION_STATUS || "");

                setActivities(data.activities || []);
                setCompetencies(data.competencies || []);
                setDevelopmentNeeds(data.development_needs || []);
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

                const hrDecision = finalDecisionOptions.find(o => o.value === data.final_decision) || supRec;
                setFinalDecision(hrDecision);
                setFinalRemarks(data.final_remarks || "");

                const defEffDate = data.effective_date
                    ? new Date(data.effective_date)
                    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
                setEffectiveDate(defEffDate);

                if (data.promoted_designation_id) {
                    const found = designationOptions.find(d => Number(d.value) === Number(data.promoted_designation_id));
                    setPromotedDesignation(found || { value: data.promoted_designation_id, label: `Designation #${data.promoted_designation_id}` });
                } else {
                    setPromotedDesignation(null);
                }

                setApprovalHistory(data.approval_history || []);
                setFinalizedBy(data.finalized_by || null);
                setFinalizedAt(data.finalized_at || null);

                setActiveTab("1");
                setShowReviewModal(true);
            } else {
                errorNotification(msg || "Could not load employee appraisal details.");
            }
        } catch (err) {
            console.error("Error opening review modal:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivityChange = (index, field, value) => {
        const updated = [...activities];
        updated[index][field] = value;
        setActivities(updated);
    };

    const handleCompetencyRating = (index, field, value) => {
        const updated = [...competencies];
        updated[index][field] = value;
        setCompetencies(updated);
    };

    const handleDevNeedChange = (index, field, value) => {
        const updated = [...developmentNeeds];
        updated[index][field] = value;
        setDevelopmentNeeds(updated);
    };

    const handleTargetChange = (index, field, value) => {
        const updated = [...nextYearTargets];
        updated[index][field] = value;
        setNextYearTargets(updated);
    };

    const handleAddTarget = () => {
        setNextYearTargets([...nextYearTargets, { target_description: '', supervisor_comment: '', display_order: nextYearTargets.length + 1 }]);
    };

    const handleRemoveTarget = (index) => {
        if (nextYearTargets.length > 1) {
            setNextYearTargets(nextYearTargets.filter((_, i) => i !== index));
        } else {
            setNextYearTargets([{ target_description: '', supervisor_comment: '', display_order: 1 }]);
        }
    };
    //#region Wizard Navigation Helpers
    const handlePrevTab = () => {
        const cur = Number(activeTab);
        if (cur > 1) {
            setActiveTab(String(cur - 1));
        }
    };

    const handleNextTab = () => {
        const cur = Number(activeTab);
        if (cur < 5) {
            setActiveTab(String(cur + 1));
        }
    };
    //#endregion

    const isSupervisor = Number(selectedRow?.APPRAISER_EMPLOYEE_NO) === Number(currentEmpNo);
    const isSupervisorSubmitted = submissionStatus === 'SUPERVISOR_SUBMITTED' || submissionStatus === 'FINALIZED';
    const isFinalized = submissionStatus === 'FINALIZED';
    const isAwaitingHrApproval = isAdminUser && submissionStatus === 'SUPERVISOR_SUBMITTED';
    const isReadOnly = !isSupervisor || isSupervisorSubmitted;
    const canEditHrDecision = isAwaitingHrApproval && !isFinalized;

    const handleHrAction = async (actionType) => {
        try {
            if (actionType === 'FINALIZE') {
                if (!finalDecision?.value) {
                    errorNotification("Please select an HR Decision / Recommendation before finalizing.");
                    return;
                }
                if (finalDecision.value === 'PROMOTION') {
                    if (!promotedDesignation?.value) {
                        errorNotification("Please select the Promoted Designation.");
                        return;
                    }
                    if (!effectiveDate) {
                        errorNotification("Please select the Effective Date for promotion.");
                        return;
                    }
                } else if (finalDecision.value === 'NORMAL_INCREMENT' || finalDecision.value === 'SPECIAL_INCREMENT') {
                    if (!effectiveDate) {
                        errorNotification("Please select the Effective Date for increment.");
                        return;
                    }
                }
            }

            setIsSaving(true);
            setSavingAction(actionType);
            const payload = {
                AcrNo: acrNo,
                ReferenceNo: Number(selectedRow?.REFERENCE_NO),
                EmployeeNo: appraiseeEmpNo,
                ActionType: actionType, // 'FINALIZE', 'RETURN_TO_SUPERVISOR'
                FinalDecision: finalDecision?.value || null,
                FinalRemarks: finalRemarks,
                EffectiveDate: effectiveDate ? formatedDateYYYYMMDD(effectiveDate) : null,
                PromotedDesignationId: promotedDesignation?.value ? toIntegerOrNull(promotedDesignation.value) : null,
                EntryBy: toNumberOrNull(userId) || 0,
                EntryIp: toStringOrEmpty(ipAddress)
            };

            const { response, status, msg } = await postData('KpiAcr/SaveAcrHr', payload);
            if (status === true) {
                if (actionType === 'FINALIZE') {
                    if (finalDecision.value === 'PROMOTION') {
                        // Auto-Hit Promotion
                        try {
                            const refRes = await getData('EmployeePromotion/GetPromotionRefNo');
                            const promoPayload = {
                                EmployeeCode: toIntegerOrNull(appraiseeEmpNo),
                                NewDesignationId: toIntegerOrNull(promotedDesignation.value),
                                EffectiveDate: formatedDateYYYYMMDD(effectiveDate),
                                Remarks: finalRemarks || "Promoted via Annual ACR Appraisal Final Approval",
                                ReferenceNo: refRes?.response || (selectedRow?.REFERENCE_CODE ? `ACR-${selectedRow.REFERENCE_CODE}` : "ACR-PROMO"),
                                EntryBy: toNumberOrNull(userId) || 0,
                                EntryIp: toStringOrEmpty(ipAddress)
                            };
                            const promoRes = await postData('EmployeePromotion/EmployeePromotionSave', promoPayload);
                            if (promoRes.status === true && promoRes.response?.action_status === 1) {
                                successNotification(`ACR Finalized & Employee Promoted to "${promotedDesignation.label}" in Payroll effective from ${formatedDate(effectiveDate)}!`);
                            } else {
                                errorNotification(`ACR was finalized, but auto-promotion in Payroll returned: ${promoRes.response?.message || promoRes.msg || 'Failed'}`);
                            }
                        } catch (promoErr) {
                            console.error("Error auto-hitting promotion:", promoErr);
                            errorNotification("ACR finalized, but an error occurred while saving promotion to Payroll.");
                        }
                    } else if (finalDecision.value === 'NORMAL_INCREMENT' || finalDecision.value === 'SPECIAL_INCREMENT') {
                        // Auto-Hit Increment
                        try {
                            const refRes = await getData('EmployeeIncrement/GetIncrementRefNo');
                            const incPayload = {
                                EmployeeCode: toIntegerOrNull(appraiseeEmpNo),
                                IncrementTypeNo: toIntegerOrNull(selectedIncrementType?.value || 1),
                                NoOfIncrement: finalDecision.value === 'SPECIAL_INCREMENT' ? 2 : 1,
                                EffectiveDate: formatedDateYYYYMMDD(effectiveDate),
                                Remarks: finalRemarks || `${finalDecision.label} via Annual ACR Appraisal Final Approval`,
                                ReferenceNo: refRes?.response || (selectedRow?.REFERENCE_CODE ? `ACR-${selectedRow.REFERENCE_CODE}` : "ACR-INC"),
                                EntryBy: toNumberOrNull(userId) || 0,
                                EntryIp: toStringOrEmpty(ipAddress)
                            };
                            const incRes = await postData('EmployeeIncrement/EmployeeIncrementSave', incPayload);
                            if (incRes.status === true && incRes.response?.action_status === 1) {
                                successNotification(`ACR Finalized & ${finalDecision.label} applied to Payroll effective from ${formatedDate(effectiveDate)}!`);
                            } else {
                                errorNotification(`ACR was finalized, but auto-increment in Payroll returned: ${incRes.response?.message || incRes.msg || 'Failed'}`);
                            }
                        } catch (incErr) {
                            console.error("Error auto-hitting increment:", incErr);
                            errorNotification("ACR finalized, but an error occurred while saving increment to Payroll.");
                        }
                    } else {
                        successNotification(response?.message || "ACR evaluation approved and finalized successfully.");
                    }
                } else {
                    successNotification(response?.message || "ACR evaluation returned to supervisor successfully.");
                }

                setShowReviewModal(false);
                fetchReviewList(selectedFilterReference?.value, selectedFilterStatus?.value, inputSearchValue, employeeOptions, selectedViewScope?.value);
            } else {
                errorNotification(msg || response?.message || "Failed to process HR action.");
            }
        } catch (err) {
            console.error("Error processing HR action:", err);
            errorNotification("Error processing HR action.");
        } finally {
            setIsSaving(false);
            setSavingAction(null);
        }
    };

    const handleSupervisorAction = async (actionType) => {
        try {
            if (actionType === 'SUBMIT' && !supervisorRecommendation?.value) {
                errorNotification("Please select a Supervisor Recommendation before submitting.");
                return;
            }
            setIsSaving(true);
            setSavingAction(actionType);
            const payload = {
                AcrNo: acrNo,
                ReferenceNo: Number(selectedRow?.REFERENCE_NO),
                EmployeeNo: appraiseeEmpNo,
                ActionType: actionType, // 'DRAFT', 'SUBMIT', 'RETURN'
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
                successNotification(response?.message || (actionType === 'DRAFT' ? "Supervisor evaluation saved as draft successfully." : "Supervisor evaluation submitted successfully."));
                if (actionType !== 'DRAFT') {
                    setShowReviewModal(false);
                } else {
                    onOpenReviewModal(selectedRow);
                }
                fetchReviewList(selectedFilterReference?.value, selectedFilterStatus?.value, inputSearchValue, employeeOptions, selectedViewScope?.value);
            } else {
                errorNotification(msg || response?.message || "Failed to submit evaluation.");
            }
        } catch (err) {
            console.error("Error saving supervisor review:", err);
            errorNotification("Error saving evaluation.");
        } finally {
            setIsSaving(false);
            setSavingAction(null);
        }
    };

    const reviewColumns = [
        { header: "SL", cell: (row, idx) => idx + 1, width: 40, className: 'text-center' },
        { header: "Cycle", accessor: "REFERENCE_CODE" },
        { header: "Employee", cell: (row) => getEmpLabel(row.EMPLOYEE_NO) },
        ...(isAdminUser ? [{
            header: "Supervisor",
            cell: (row) => getEmpLabel(row.APPRAISER_EMPLOYEE_NO) || 'N/A'
        }] : []),
        {
            header: "Submitted At",
            cell: (row) => row.EMPLOYEE_SUBMITTED_AT ? row.EMPLOYEE_SUBMITTED_AT.replace('T', ' ').substring(0, 16) : 'N/A',
            className: 'text-center'
        },
        {
            header: "Status",
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
        { header: "Supervisor Assessment", accessor: "SUPERVISOR_PERFORMANCE" },
        { header: "Final Decision", accessor: "FINAL_DECISION" },
        {
            header: "Review / Evaluate",
            width: 80,
            cell: (row) => {
                const isRowFinalized = row.SUBMISSION_STATUS === 'FINALIZED';
                const isRowSupervisorSubmitted = row.SUBMISSION_STATUS === 'SUPERVISOR_SUBMITTED';
                const isRowSupervisor = Number(row.APPRAISER_EMPLOYEE_NO) === Number(currentEmpNo);

                let titleText = "View Appraisal (Read-Only)";
                if (isRowFinalized) {
                    titleText = "View Finalized Appraisal";
                } else if (isAdminUser && isRowSupervisorSubmitted) {
                    titleText = "Review & Finalize Appraisal (HR Approval)";
                } else if (isRowSupervisor && !isRowSupervisorSubmitted) {
                    titleText = "Review & Evaluate Appraisal (Supervisor Mode)";
                }

                return (
                    <div className="d-flex justify-content-center">
                        <button
                            style={{ border: "none", background: "none" }}
                            onClick={() => onOpenReviewModal(row)}
                            title={titleText}
                        >
                            <i className={`fas fa-eye ${isRowFinalized ? 'text-success' : isAdminUser && isRowSupervisorSubmitted ? 'text-primary' : 'text-info'}`} style={{ fontSize: 16 }}></i>
                        </button>
                    </div>
                );
            },
            className: 'text-center'
        },
    ];

    return (
        <React.Fragment>
            <div className="page-content">
                {loading && !isShowReviewModal ? (
                    <div className='loading-overlay'>
                        <div className='spinner'></div>
                    </div>
                ) : (
                    <div className='mainDiv' style={{ minHeight: 800 }}>
                        {/* Search & Filter Header (Follows EmployeeSetup filter style) */}
                        <div className="card" style={{ padding: 10 }}>
                            <div className="row g-2 text-start">
                                <div className={`${isAdminUser ? 'col-md-2' : 'col-md-3'} col-sm-12`}>
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

                                {isAdminUser && (
                                    <div className='col-md-2 col-sm-12'>
                                        <div className="row">
                                            <div className="col-12">
                                                <label style={{ marginBottom: -3 }}>Review Scope</label>
                                                <Select
                                                    options={viewScopeOptions}
                                                    value={selectedViewScope}
                                                    styles={dropdownStyles3}
                                                    onChange={(e) => {
                                                        setSelectedViewScope(e);
                                                        fetchReviewList(selectedFilterReference?.value, selectedFilterStatus?.value, inputSearchValue, employeeOptions, e?.value);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={`${isAdminUser ? 'col-md-2' : 'col-md-3'} col-sm-12`}>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Filter Status</label>
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

                                <div className='col-md-3 col-sm-12'>
                                    <div className="row">
                                        <div className="col-12">
                                            <label style={{ marginBottom: -3 }}>Search Employee</label>
                                            <input
                                                className="form-control inputHeight"
                                                value={inputSearchValue}
                                                onChange={(e) => setInputSearchValue(e.target.value)}
                                                placeholder="Search by Employee No / Name..."
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
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Master Records Table */}
                        <div className="card" style={{ padding: 10, marginTop: -15 }}>
                            <Table columns={reviewColumns} data={reviewList} isLoading={loading} scroll={{ x: true, y: true }} />
                        </div>

                        {/* Full Screen Review Modal (Follows EmployeeSetup modal/tab style) */}
                        <div className="modal" tabIndex="-1" role="dialog"
                            style={{
                                display: isShowReviewModal ? "block" : "none",
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
                                                <i className="fas fa-user-check"></i> ACR Supervisor Review & Evaluation
                                            </h5>
                                            <span className="badge bg-light text-dark fw-bold">
                                                Appraisee: {getEmpLabel(appraiseeEmpNo) || `Emp #${appraiseeEmpNo}`}
                                            </span>
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
                                                Status: {submissionStatus}
                                            </span>
                                            {isFinalized && (
                                                <span 
                                                    className="badge bg-success text-white"
                                                    style={{
                                                        fontSize: '11px',
                                                        padding: '5px 12px',
                                                        borderRadius: '12px',
                                                        fontWeight: '600',
                                                        letterSpacing: '0.2px'
                                                    }}
                                                >
                                                    <i className="fas fa-check-double"></i> HR Finalized & Approved
                                                </span>
                                            )}
                                            {isAwaitingHrApproval && (
                                                <span 
                                                    className="badge bg-warning text-dark"
                                                    style={{
                                                        fontSize: '11px',
                                                        padding: '5px 12px',
                                                        borderRadius: '12px',
                                                        fontWeight: '600',
                                                        letterSpacing: '0.2px'
                                                    }}
                                                >
                                                    <i className="fas fa-gavel"></i> HR Final Approval Mode
                                                </span>
                                            )}
                                            {!isSupervisor && !isAwaitingHrApproval && !isFinalized && (
                                                <span 
                                                    className="badge bg-secondary text-white"
                                                    style={{
                                                        fontSize: '11px',
                                                        padding: '5px 12px',
                                                        borderRadius: '12px',
                                                        fontWeight: '600',
                                                        letterSpacing: '0.2px'
                                                    }}
                                                >
                                                    <i className="fas fa-eye"></i> HR / Admin View Mode (Read-Only)
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            style={{ color: "white", backgroundColor: 'red' }}
                                            className="btn btn-close"
                                            aria-label="Close"
                                            onClick={() => setShowReviewModal(false)}
                                        />
                                    </div>

                                    <div className="modal-body" style={{ padding: 10 }}>
                                        {/* Styled Pill Nav Tabs (Follows EmployeeSetup tab styling) */}
                                        <Nav tabs style={{ borderBottom: 'none' }}>
                                            {[
                                                { id: '1', title: '1. ACTIVITIES & TASKS', width: 190 },
                                                { id: '2', title: '2. COMPETENCY RATINGS', width: 200 },
                                                { id: '3', title: '3. DEVELOPMENT NEEDS', width: 200 },
                                                { id: '4', title: '4. NEXT YEAR TARGETS', width: 190 },
                                                { id: '5', title: '5. FINAL DECISION', width: 190 }
                                            ].map((tab) => (
                                                <NavItem key={tab.id}>
                                                    <NavLink
                                                        style={{
                                                            backgroundColor: activeTab === tab.id ? '#34c38f' : '#f6f6f6',
                                                            color: activeTab === tab.id ? '#fff' : '#000',
                                                            borderRadius: 20,
                                                            borderColor: '#34c38f',
                                                            width: tab.width,
                                                            height: 30,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            cursor: 'pointer',
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

                                        <div className='row'>
                                            <TabContent activeTab={activeTab}>
                                                {/* TAB 1: ACTIVITIES */}
                                                <TabPane tabId='1'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <h5 className="mb-2">Review Key Activities & Assign Supervisor Score</h5>
                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th>Description of Major Activity / Task</th>
                                                                        <th style={{ width: 170 }}>Emp. Achievement %</th>
                                                                        <th style={{ width: 170 }}>Sup. Achievement %</th>
                                                                        <th>Supervisor Comments</th>
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
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight fw-bold text-center"
                                                                                    value={act.employee_achievement_percent || ''}
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight text-center"
                                                                                    value={act.supervisor_achievement_percent || ''}
                                                                                    disabled={isReadOnly}
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
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={act.supervisor_comment || ''}
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => handleActivityChange(idx, 'supervisor_comment', e.target.value)}
                                                                                    placeholder="Supervisor feedback..."
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 2: COMPETENCIES */}
                                                <TabPane tabId='2'>
                                                    <div className="mt-3 customColorSchemeBorder" style={{ padding: 10, borderRadius: 5 }}>
                                                        <h5 className="mb-2">Review Self-Ratings & Provide Supervisor Assessment</h5>
                                                        <div className="table-responsive" style={{ overflow: 'visible' }}>
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th style={{ width: 220 }}>Competency Area</th>
                                                                        <th>Description</th>
                                                                        <th style={{ width: 170, minWidth: 160 }}>Self-Rating</th>
                                                                        <th style={{ width: 170, minWidth: 160 }}>Supervisor Rating</th>
                                                                        <th>Supervisor Comments</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {competencies.map((comp, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-center">{idx + 1}</td>
                                                                            <td className="fw-bold">{comp.competency_name}</td>
                                                                            <td className="small text-muted">{comp.description}</td>
                                                                            <td style={{ width: 170, minWidth: 160 }}>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight fw-bold"
                                                                                    value={comp.employee_rating || 'N/A'}
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td style={{ width: 170, minWidth: 160, position: 'relative' }}>
                                                                                <Select
                                                                                    options={ratingOptions}
                                                                                    value={ratingOptions.find(o => o.value === comp.supervisor_rating) || null}
                                                                                    styles={ratingDropdownStyles}
                                                                                    menuPlacement="auto"
                                                                                    isDisabled={isReadOnly}
                                                                                    placeholder="Select Rating"
                                                                                    onChange={(selected) => handleCompetencyRating(idx, 'supervisor_rating', selected ? selected.value : null)}
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={comp.supervisor_comment || ''}
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => handleCompetencyRating(idx, 'supervisor_comment', e.target.value)}
                                                                                    placeholder="Supervisor comment..."
                                                                                />
                                                                            </td>
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
                                                        <h5 className="mb-2">Employee Development Needs & Supervisor Feedback</h5>
                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: 45 }} className="text-center">SL</th>
                                                                        <th>Area to Improve</th>
                                                                        <th>Action / Training Required</th>
                                                                        <th style={{ width: 170 }}>Responsible Person</th>
                                                                        <th style={{ width: 150 }}>Target Deadline</th>
                                                                        <th>Supervisor Comments</th>
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
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.action_required || ''}
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.responsible_person || ''}
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.target_deadline ? dev.target_deadline.substring(0, 10) : ''}
                                                                                    disabled
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={dev.supervisor_comment || ''}
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => handleDevNeedChange(idx, 'supervisor_comment', e.target.value)}
                                                                                    placeholder="Supervisor feedback/approval..."
                                                                                />
                                                                            </td>
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
                                                            <h5 className="mb-0">Agreed Next Year Goals & Objectives</h5>
                                                            {!isReadOnly && (
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
                                                                        <th>Supervisor Comments</th>
                                                                        <th style={{ width: 60 }} className="text-center">Action</th>
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
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => handleTargetChange(idx, 'target_description', e.target.value)}
                                                                                    placeholder="Enter targeted project outcome..."
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control inputHeight"
                                                                                    value={tgt.supervisor_comment || ''}
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => handleTargetChange(idx, 'supervisor_comment', e.target.value)}
                                                                                    placeholder="Supervisor remarks..."
                                                                                />
                                                                            </td>
                                                                            <td className="text-center">
                                                                                {!isReadOnly && (
                                                                                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveTarget(idx)}>
                                                                                        ✕
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </TabPane>

                                                {/* TAB 5: EVALUATION & DECISIONS */}
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
                                                                                    isDisabled={isReadOnly}
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
                                                                                    isDisabled={isReadOnly}
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
                                                                                    disabled={isReadOnly}
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
                                                                                    isDisabled={isReadOnly}
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
                                                                                    disabled={isReadOnly}
                                                                                    onChange={(e) => setSupervisorRemarks(e.target.value)}
                                                                                    placeholder="Supervisor's recommendation remarks or notes..."
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Section 5-B: HR & Management Committee Final Decision */}
                                                        <div className="card mb-3 customColorSchemeBorder" style={{ borderRadius: 6 }}>
                                                            <div className="card-header py-2" style={{ backgroundColor: '#f0fdf4' }}>
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <h6 className="mb-0 text-success fw-bold" style={{ fontSize: '13px' }}>
                                                                        <i className="fas fa-gavel me-2"></i> Section B: HR & Management Committee Final Decision
                                                                    </h6>
                                                                    {isFinalized ? (
                                                                        <span className="badge bg-success" style={{ fontSize: '10px' }}>
                                                                            <i className="fas fa-check-circle me-1"></i> FINALIZED & APPROVED
                                                                        </span>
                                                                    ) : isAwaitingHrApproval ? (
                                                                        <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                                                                            <i className="fas fa-hourglass-half me-1"></i> AWAITING HR DECISION
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-secondary" style={{ fontSize: '10px' }}>
                                                                            <i className="fas fa-clock me-1"></i> PENDING SUPERVISOR
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="card-body p-3">
                                                                {isAwaitingHrApproval && (
                                                                    <div className="alert alert-info py-1 px-2 mb-3" style={{ fontSize: '12px' }}>
                                                                        <i className="fas fa-info-circle me-1"></i>
                                                                        <strong>HR Review Mode:</strong> Review the supervisor's recommendation above, set or confirm the official committee decision, and click <strong>APPROVE & FINALIZE</strong> below.
                                                                    </div>
                                                                )}

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
                                                                                    isDisabled={!canEditHrDecision}
                                                                                    placeholder="Select Official Decision"
                                                                                    onChange={(selected) => setFinalDecision(selected)}
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
                                                                                    value={finalRemarks}
                                                                                    disabled={!canEditHrDecision}
                                                                                    onChange={(e) => setFinalRemarks(e.target.value)}
                                                                                    placeholder={isAwaitingHrApproval ? "Committee resolution / approval remarks..." : "(HR remarks will appear after review)"}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Conditional Execution Fields for Promotion */}
                                                                {finalDecision?.value === 'PROMOTION' && (
                                                                    <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                                                        <div className="row g-3">
                                                                            <div className="col-md-6 col-sm-12">
                                                                                <div className="row g-2">
                                                                                    <div className="col-4">
                                                                                        <label style={{ paddingTop: 3 }} className="text-success fw-bold">
                                                                                            Promoted Desig <span style={{ color: "red" }}>*</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="col-8">
                                                                                        <Select
                                                                                            options={designationOptions}
                                                                                            value={promotedDesignation}
                                                                                            styles={dropdownStyles3}
                                                                                            isDisabled={!canEditHrDecision}
                                                                                            placeholder="Select New Designation"
                                                                                            onChange={(selected) => setPromotedDesignation(selected)}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="col-md-6 col-sm-12">
                                                                                <div className="row g-2">
                                                                                    <div className="col-3">
                                                                                        <label style={{ paddingTop: 3 }} className="text-success fw-bold">
                                                                                            Effective Date <span style={{ color: "red" }}>*</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="col-9">
                                                                                        <DatePicker
                                                                                            className="form-control inputHeight"
                                                                                            wrapperClassName="w-100"
                                                                                            selected={effectiveDate}
                                                                                            onChange={(date) => setEffectiveDate(date)}
                                                                                            dateFormat="dd-MM-yyyy"
                                                                                            disabled={!canEditHrDecision}
                                                                                            placeholderText="DD-MM-YYYY"
                                                                                            popperClassName="custom-datepicker-popper"
                                                                                            showMonthDropdown
                                                                                            showYearDropdown
                                                                                            dropdownMode="select"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {canEditHrDecision ? (
                                                                            <div className="alert alert-warning py-1 px-2 mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                                                <i className="fas fa-bolt text-danger me-1"></i>
                                                                                <strong>Auto-Hit Payroll:</strong> Upon final approval, this employee will be officially promoted to <strong>{promotedDesignation?.label || '[Selected Designation]'}</strong> and updated in <em>Payroll Salary Movement</em> effective from <strong>{effectiveDate ? formatedDate(effectiveDate) : '[Effective Date]'}</strong>.
                                                                            </div>
                                                                        ) : isFinalized && (
                                                                            <div className="alert alert-success py-1 px-2 mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                                                <i className="fas fa-check-circle me-1"></i>
                                                                                <strong>Payroll Impact:</strong> Officially promoted to <strong>{promotedDesignation?.label || 'New Designation'}</strong> effective from <strong>{effectiveDate ? formatedDate(effectiveDate) : 'N/A'}</strong>.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Conditional Execution Fields for Increment (Normal or Special) */}
                                                                {(finalDecision?.value === 'NORMAL_INCREMENT' || finalDecision?.value === 'SPECIAL_INCREMENT') && (
                                                                    <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                                                        <div className="row g-3">
                                                                            <div className="col-md-6 col-sm-12">
                                                                                <div className="row g-2">
                                                                                    <div className="col-4">
                                                                                        <label style={{ paddingTop: 3 }} className="text-success fw-bold">
                                                                                            Increment Steps
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="col-8">
                                                                                        <input
                                                                                            className="form-control inputHeight"
                                                                                            disabled
                                                                                            value={finalDecision.value === 'NORMAL_INCREMENT' ? '1 Step (Normal Increment)' : '2 Steps (Special Increment)'}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="col-md-6 col-sm-12">
                                                                                <div className="row g-2">
                                                                                    <div className="col-3">
                                                                                        <label style={{ paddingTop: 3 }} className="text-success fw-bold">
                                                                                            Effective Date <span style={{ color: "red" }}>*</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="col-9">
                                                                                        <DatePicker
                                                                                            className="form-control inputHeight"
                                                                                            wrapperClassName="w-100"
                                                                                            selected={effectiveDate}
                                                                                            onChange={(date) => setEffectiveDate(date)}
                                                                                            dateFormat="dd-MM-yyyy"
                                                                                            disabled={!canEditHrDecision}
                                                                                            placeholderText="DD-MM-YYYY"
                                                                                            popperClassName="custom-datepicker-popper"
                                                                                            showMonthDropdown
                                                                                            showYearDropdown
                                                                                            dropdownMode="select"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {canEditHrDecision ? (
                                                                            <div className="alert alert-warning py-1 px-2 mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                                                <i className="fas fa-bolt text-danger me-1"></i>
                                                                                <strong>Auto-Hit Payroll:</strong> Upon final approval, a <strong>{finalDecision.value === 'NORMAL_INCREMENT' ? '1-step' : '2-step'} increment</strong> will be automatically calculated on basic salary in <em>Payroll Salary Movement</em> effective from <strong>{effectiveDate ? formatedDate(effectiveDate) : '[Effective Date]'}</strong>.
                                                                            </div>
                                                                        ) : isFinalized && (
                                                                            <div className="alert alert-success py-1 px-2 mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                                                <i className="fas fa-check-circle me-1"></i>
                                                                                <strong>Payroll Impact:</strong> {finalDecision?.label} applied in Payroll effective from <strong>{effectiveDate ? formatedDate(effectiveDate) : 'N/A'}</strong>.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Informational Banner for No Increment */}
                                                                {finalDecision?.value === 'NO_INCREMENT' && (
                                                                    <div className="alert alert-secondary py-1 px-2 mt-3 mb-0" style={{ fontSize: '12px' }}>
                                                                        <i className="fas fa-info-circle me-1"></i>
                                                                        <strong>Payroll Impact:</strong> No increment or promotion. Employee salary and designation remain unchanged.
                                                                    </div>
                                                                )}

                                                                {finalizedAt && (
                                                                    <div className="mt-2 text-muted" style={{ fontSize: '11px' }}>
                                                                        <i className="fas fa-check-double text-success me-1"></i>
                                                                        Approved by <strong>{getEmpLabel(finalizedBy) || `User #${finalizedBy}`}</strong> on <strong>{finalizedAt.replace('T', ' ').substring(0, 16)}</strong>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Approval & Workflow History Timeline */}
                                                        {approvalHistory.length > 0 && (
                                                            <div className="mt-4 pt-3" style={{ borderTop: '1px dashed #dee2e6' }}>
                                                                <h6 className="text-secondary fw-bold mb-2">
                                                                    <i className="fas fa-history"></i> Appraisal Approval & Workflow History
                                                                </h6>
                                                                <div className="table-responsive">
                                                                    <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: '12px' }}>
                                                                        <thead className="table-light">
                                                                            <tr>
                                                                                <th style={{ width: 40 }} className="text-center">#</th>
                                                                                <th style={{ width: 130 }}>Action Role</th>
                                                                                <th style={{ width: 180 }}>Action Taken</th>
                                                                                <th>Remarks</th>
                                                                                <th style={{ width: 160 }} className="text-center">Date & Time</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {approvalHistory.map((h, i) => (
                                                                                <tr key={i}>
                                                                                    <td className="text-center">{i + 1}</td>
                                                                                    <td>
                                                                                        <span className={`badge ${h.action_role === 'HR' ? 'bg-primary' : 'bg-info'}`}>
                                                                                            {h.action_role}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="fw-bold">{h.action_type}</td>
                                                                                    <td>{h.remarks || '-'}</td>
                                                                                    <td className="text-center text-muted">
                                                                                        {h.action_date ? h.action_date.replace('T', ' ').substring(0, 16) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TabPane>
                                            </TabContent>
                                        </div>

                                        {/* Modal Footer with Wizard Navigation */}
                                        <div className="row g-2 mt-3 pt-2" style={{ borderTop: '1px solid #dee2e6' }}>
                                            <div className="col-5 d-flex justify-content-start gap5px">
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

                                            <div className="col-7 d-flex justify-content-end align-items-center gap5px">
                                                {/* Finalized badge */}
                                                {isFinalized && (
                                                    <span className="badge bg-success" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-check-double"></i> ACR FINALIZED & APPROVED
                                                    </span>
                                                )}

                                                {/* Read-Only viewer badge */}
                                                {!isSupervisor && !isAwaitingHrApproval && !isFinalized && (
                                                    <span className="badge bg-secondary" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-eye"></i> HR / ADMIN VIEW MODE (READ-ONLY)
                                                    </span>
                                                )}

                                                {/* Supervisor Submitted Locked badge (when not finalized yet) */}
                                                {isSupervisor && isSupervisorSubmitted && !isFinalized && (
                                                    <span className="badge bg-info text-white" style={{ height: 25, lineHeight: '25px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fas fa-lock"></i> EVALUATION SUBMITTED (AWAITING HR)
                                                    </span>
                                                )}

                                                {/* SAVE EVALUATION (Supervisor Draft) - Available only when supervisor and not yet submitted */}
                                                {isSupervisor && !isSupervisorSubmitted && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger buttonCss"
                                                        style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                        disabled={isSaving}
                                                        onClick={() => handleSupervisorAction('DRAFT')}
                                                        title="Save evaluation as draft"
                                                    >
                                                        {savingAction === 'DRAFT' ? <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} /> : 'SAVE EVALUATION'}
                                                    </button>
                                                )}

                                                {/* NEXT button - Navigate to next tab if not on the final tab */}
                                                {Number(activeTab) < 5 && (
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

                                                {/* Supervisor Final Actions - Only on Tab 5 when supervisor and not yet submitted */}
                                                {isSupervisor && !isSupervisorSubmitted && activeTab === '5' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-warning buttonCss"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleSupervisorAction('RETURN')}
                                                        >
                                                            {savingAction === 'RETURN' ? <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} /> : 'RETURN TO EMPLOYEE'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-success buttonCss gap5px"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleSupervisorAction('SUBMIT')}
                                                        >
                                                            {savingAction === 'SUBMIT' ? (
                                                                <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-check-circle"></i> APPROVE & SUBMIT
                                                                </>
                                                            )}
                                                        </button>
                                                    </>
                                                )}

                                                {/* HR / ADMIN FINAL APPROVAL ACTIONS: Available when supervisor submitted and user is HR/Admin on Tab 5 */}
                                                {isAwaitingHrApproval && activeTab === '5' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-warning buttonCss gap5px"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleHrAction('RETURN_TO_SUPERVISOR')}
                                                            title="Return appraisal to supervisor for revision"
                                                        >
                                                            {savingAction === 'RETURN_TO_SUPERVISOR' ? (
                                                                <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-undo"></i> RETURN TO SUPERVISOR
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-success buttonCss gap5px"
                                                            style={{ height: 25, lineHeight: '25px', padding: '0 12px' }}
                                                            disabled={isSaving}
                                                            onClick={() => handleHrAction('FINALIZE')}
                                                            title="Finalize & approve ACR evaluation"
                                                        >
                                                            {savingAction === 'FINALIZE' ? (
                                                                <img src={loadingIcon} alt="Loading..." style={{ width: 20, height: 20 }} />
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-check-double"></i> APPROVE & FINALIZE
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

export default AcrApprovalList;

// Enterprise Performance Appraisal Module

//ACR Approval / Review List
