(function () {
    'use strict';

    // TEMPORARY TEST VALUES. Replace these after the client approves the
    // official Money Tree credit policy. Every page reads from this object.
    const TEMP_RULES = Object.freeze({
        testMode: true,
        monthlyInterestRate: 0.02,
        arrangementFee: 0,
        monthlyAdminFee: 0,
        repaymentMethod: 'Payroll deduction',
        paymentFrequency: 'Monthly',
        salaryRetentionRate: 0.40
    });

    // Increase this value whenever the client approves new contract wording.
    // Acceptance records retain the version that the borrower reviewed.
    const CONTRACT_VERSION = 'MT-PROTOTYPE-CONTRACT-V3';

    function number(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function roundMoney(value) {
        return Math.round((number(value) + Number.EPSILON) * 100) / 100;
    }

    function money(value) {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2
        }).format(number(value)).replace('ZMW', 'K').trim();
    }

    function toDate(value) {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value, fallback = 'Not set') {
        const date = toDate(value);
        if (!date) return fallback;
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    function formatDateTime(value, fallback = 'Not set') {
        const date = toDate(value);
        if (!date) return fallback;
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function dateInputValue(value) {
        const date = toDate(value) || new Date();
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
    }

    function addMonths(value, count) {
        const source = toDate(value) || new Date();
        const target = new Date(source);
        const originalDay = target.getDate();
        target.setDate(1);
        target.setMonth(target.getMonth() + count);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(originalDay, lastDay));
        return target;
    }

    function calculateSchedule(options) {
        const principal = roundMoney(options.principal);
        const termMonths = Math.max(1, Math.round(number(options.termMonths, 1)));
        const monthlyRate = Math.max(0, number(options.monthlyInterestRate));
        const arrangementFee = Math.max(0, roundMoney(options.arrangementFee));
        const monthlyAdminFee = Math.max(0, roundMoney(options.monthlyAdminFee));
        const firstPaymentDate = toDate(options.firstPaymentDate) || addMonths(new Date(), 1);

        if (principal <= 0) throw new Error('Approved amount must be greater than zero.');

        const compound = Math.pow(1 + monthlyRate, termMonths);
        const basePayment = monthlyRate === 0
            ? principal / termMonths
            : principal * (monthlyRate * compound) / (compound - 1);

        let balance = principal;
        const installments = [];

        for (let index = 0; index < termMonths; index += 1) {
            const interest = roundMoney(balance * monthlyRate);
            let principalPart = index === termMonths - 1
                ? roundMoney(balance)
                : roundMoney(basePayment - interest);

            principalPart = Math.min(principalPart, roundMoney(balance));
            const fee = roundMoney(monthlyAdminFee + (index === 0 ? arrangementFee : 0));
            const amount = roundMoney(principalPart + interest + fee);
            balance = roundMoney(balance - principalPart);

            installments.push({
                number: index + 1,
                dueDate: addMonths(firstPaymentDate, index).toISOString(),
                amount,
                principal: principalPart,
                interest,
                fees: fee,
                paidAmount: 0,
                status: 'upcoming'
            });
        }

        const totalInterest = roundMoney(installments.reduce((sum, item) => sum + item.interest, 0));
        const totalFees = roundMoney(installments.reduce((sum, item) => sum + item.fees, 0));
        const totalRepay = roundMoney(installments.reduce((sum, item) => sum + item.amount, 0));

        return {
            principal,
            termMonths,
            monthlyInterestRate: monthlyRate,
            annualPercentageRate: roundMoney(monthlyRate * 12 * 100),
            arrangementFee,
            monthlyAdminFee,
            totalInterest,
            totalFees,
            totalCostOfCredit: roundMoney(totalInterest + totalFees),
            totalRepay,
            installmentAmount: installments[0] ? installments[0].amount : totalRepay,
            firstPaymentDate: firstPaymentDate.toISOString(),
            loanEndDate: installments.length ? installments[installments.length - 1].dueDate : firstPaymentDate.toISOString(),
            installments
        };
    }

    function buildContractTerms(schedule, options = {}) {
        const amountToReceive = roundMoney(
            options.amountToReceive != null ? options.amountToReceive : schedule.principal
        );
        if (amountToReceive <= 0) throw new Error('Amount to receive must be greater than zero.');

        const terms = {
            currency: 'ZMW',
            approvedAmount: roundMoney(schedule.principal),
            amountToReceive,
            termMonths: Math.max(1, Math.round(number(schedule.termMonths, 1))),
            monthlyInterestRate: number(schedule.monthlyInterestRate),
            annualPercentageRate: number(schedule.annualPercentageRate),
            arrangementFee: roundMoney(schedule.arrangementFee),
            monthlyAdminFee: roundMoney(schedule.monthlyAdminFee),
            totalInterest: roundMoney(schedule.totalInterest),
            totalFees: roundMoney(schedule.totalFees),
            totalCostOfCredit: roundMoney(schedule.totalCostOfCredit),
            totalRepay: roundMoney(schedule.totalRepay),
            installmentAmount: roundMoney(schedule.installmentAmount),
            repaymentMethod: options.repaymentMethod || TEMP_RULES.repaymentMethod,
            paymentFrequency: options.paymentFrequency || TEMP_RULES.paymentFrequency,
            firstPaymentDate: schedule.firstPaymentDate,
            loanEndDate: schedule.loanEndDate,
            repaymentSchedule: (schedule.installments || []).map(item => ({
                number: Math.round(number(item.number)),
                dueDate: item.dueDate,
                amount: roundMoney(item.amount),
                principal: roundMoney(item.principal),
                interest: roundMoney(item.interest),
                fees: roundMoney(item.fees)
            }))
        };

        if (options.affordability) {
            terms.affordability = {
                basicSalary: roundMoney(options.affordability.basicSalary),
                existingDeductions: roundMoney(options.affordability.existingDeductions),
                salaryRetentionRate: number(
                    options.affordability.salaryRetentionRate,
                    TEMP_RULES.salaryRetentionRate
                ),
                minimumSalaryRemaining: roundMoney(options.affordability.minimumSalaryRemaining),
                maximumTotalDeductions: roundMoney(options.affordability.maximumTotalDeductions),
                availableMonthlyDeduction: roundMoney(options.affordability.availableMonthlyDeduction),
                maximumAffordableLoan: roundMoney(options.affordability.maximumAffordableLoan),
                projectedPayrollDeduction: roundMoney(options.affordability.projectedPayrollDeduction),
                projectedSalaryAfterDeductions: roundMoney(options.affordability.projectedSalaryAfterDeductions),
                affordabilityStatus: options.affordability.affordabilityStatus || 'not-evaluated'
            };
        }

        return terms;
    }

    function calculateSalaryCapacity(options) {
        const basicSalary = roundMoney(options.basicSalary);
        const existingDeductions = roundMoney(options.existingDeductions);
        const salaryRetentionRate = Math.min(1, Math.max(
            0,
            number(options.salaryRetentionRate, TEMP_RULES.salaryRetentionRate)
        ));

        if (basicSalary <= 0) throw new Error('Basic salary must be greater than zero.');
        if (existingDeductions < 0) throw new Error('Existing deductions cannot be negative.');

        const minimumSalaryRemaining = roundMoney(basicSalary * salaryRetentionRate);
        const maximumTotalDeductions = roundMoney(basicSalary - minimumSalaryRemaining);
        const availableMonthlyDeduction = Math.max(
            0,
            roundMoney(maximumTotalDeductions - existingDeductions)
        );

        return {
            basicSalary,
            existingDeductions,
            salaryRetentionRate,
            minimumSalaryRemaining,
            maximumTotalDeductions,
            availableMonthlyDeduction,
            currentSalaryAfterDeductions: roundMoney(basicSalary - existingDeductions)
        };
    }

    function maximumAffordablePrincipal(options) {
        const availableMonthlyDeduction = roundMoney(options.availableMonthlyDeduction);
        const termMonths = Math.max(1, Math.round(number(options.termMonths, 1)));
        const monthlyAdminFee = Math.max(0, roundMoney(options.monthlyAdminFee));
        const arrangementFee = Math.max(0, roundMoney(options.arrangementFee));

        if (availableMonthlyDeduction <= 0) return 0;
        if (monthlyAdminFee + arrangementFee > availableMonthlyDeduction) return 0;

        let low = 1;
        let high = Math.max(1, Math.floor(availableMonthlyDeduction * termMonths * 100));
        let best = 0;

        while (low <= high) {
            const midpoint = Math.floor((low + high) / 2);
            const principal = midpoint / 100;
            const schedule = calculateSchedule({
                principal,
                termMonths,
                monthlyInterestRate: options.monthlyInterestRate,
                arrangementFee,
                monthlyAdminFee,
                firstPaymentDate: options.firstPaymentDate
            });
            const fits = schedule.installments.every(item => (
                roundMoney(item.amount) <= availableMonthlyDeduction
            ));

            if (fits) {
                best = midpoint;
                low = midpoint + 1;
            } else {
                high = midpoint - 1;
            }
        }

        return roundMoney(best / 100);
    }

    function evaluateAffordability(options) {
        const capacity = calculateSalaryCapacity(options);
        const approvedAmount = roundMoney(options.approvedAmount);
        const maximumAffordableLoan = maximumAffordablePrincipal({
            ...options,
            availableMonthlyDeduction: capacity.availableMonthlyDeduction
        });

        let projectedPayrollDeduction = 0;
        if (approvedAmount > 0) {
            const proposedSchedule = calculateSchedule({
                principal: approvedAmount,
                termMonths: options.termMonths,
                monthlyInterestRate: options.monthlyInterestRate,
                arrangementFee: options.arrangementFee,
                monthlyAdminFee: options.monthlyAdminFee,
                firstPaymentDate: options.firstPaymentDate
            });
            projectedPayrollDeduction = roundMoney(Math.max(
                ...proposedSchedule.installments.map(item => item.amount)
            ));
        }

        const withinLimit = approvedAmount > 0
            && approvedAmount <= maximumAffordableLoan
            && projectedPayrollDeduction <= capacity.availableMonthlyDeduction;

        return {
            ...capacity,
            maximumAffordableLoan,
            projectedPayrollDeduction,
            projectedSalaryAfterDeductions: roundMoney(
                capacity.basicSalary - capacity.existingDeductions - projectedPayrollDeduction
            ),
            affordabilityStatus: withinLimit ? 'within-limit' : 'exceeds-limit',
            withinLimit
        };
    }

    function applyPayment(loan, amount, paymentDate) {
        let unapplied = roundMoney(amount);
        if (unapplied <= 0) throw new Error('Payment amount must be greater than zero.');

        const installments = (loan.installments || []).map(item => ({ ...item }));
        if (!installments.length) throw new Error('This loan does not have a repayment schedule yet.');

        installments.forEach(item => {
            if (unapplied <= 0) return;
            const alreadyPaid = roundMoney(item.paidAmount);
            const outstanding = Math.max(0, roundMoney(number(item.amount) - alreadyPaid));
            const allocated = Math.min(outstanding, unapplied);
            item.paidAmount = roundMoney(alreadyPaid + allocated);
            unapplied = roundMoney(unapplied - allocated);
            item.status = item.paidAmount >= roundMoney(item.amount) ? 'paid' : 'partial';
            if (allocated > 0) item.lastPaymentDate = (toDate(paymentDate) || new Date()).toISOString();
        });

        const previousPaid = roundMoney(loan.totalPaid);
        const appliedAmount = roundMoney(amount - unapplied);
        const totalPaid = Math.min(roundMoney(previousPaid + appliedAmount), roundMoney(loan.totalRepay));
        const remainingBalance = Math.max(0, roundMoney(number(loan.totalRepay) - totalPaid));

        return {
            installments,
            appliedAmount,
            unappliedAmount: unapplied,
            totalPaid,
            remainingBalance,
            status: remainingBalance === 0 ? 'repaid' : 'active'
        };
    }

    function loanSummary(loan) {
        const terms = loan.contractTerms || {};
        const principal = roundMoney(terms.approvedAmount ?? loan.approvedAmount ?? loan.amount);
        const legacyInterest = number(loan.interest);
        const totalInterest = roundMoney(terms.totalInterest ?? loan.totalInterest ?? legacyInterest);
        const totalFees = roundMoney(terms.totalFees ?? loan.totalFees);
        const totalRepay = roundMoney(terms.totalRepay ?? loan.totalRepay ?? principal + totalInterest + totalFees);
        const totalPaid = roundMoney(loan.totalPaid);
        return {
            applicationNumber: loan.applicationNumber || 'Pending number',
            principal,
            disbursedAmount: roundMoney(
                loan.disbursedAmount ?? terms.amountToReceive ?? loan.amountToReceive ?? principal
            ),
            totalInterest,
            totalFees,
            totalCostOfCredit: roundMoney(
                terms.totalCostOfCredit ?? loan.totalCostOfCredit ?? totalInterest + totalFees
            ),
            totalRepay,
            totalPaid,
            remainingBalance: roundMoney(loan.remainingBalance != null ? loan.remainingBalance : Math.max(0, totalRepay - totalPaid)),
            termMonths: Math.max(1, Math.round(number(
                terms.termMonths ?? loan.termMonths,
                Math.ceil(number(loan.period, 30) / 30)
            ))),
            monthlyInterestRate: number(
                terms.monthlyInterestRate ?? loan.monthlyInterestRate,
                TEMP_RULES.monthlyInterestRate
            ),
            annualPercentageRate: number(
                terms.annualPercentageRate ?? loan.annualPercentageRate,
                TEMP_RULES.monthlyInterestRate * 1200
            ),
            repaymentMethod: terms.repaymentMethod || loan.repaymentMethod || TEMP_RULES.repaymentMethod,
            paymentFrequency: terms.paymentFrequency || loan.paymentFrequency || TEMP_RULES.paymentFrequency
        };
    }

    function installmentView(item) {
        const dueDate = toDate(item.dueDate);
        const paidAmount = roundMoney(item.paidAmount);
        const amount = roundMoney(item.amount);
        let status = paidAmount >= amount ? 'paid' : paidAmount > 0 ? 'partial' : 'upcoming';
        if (status === 'upcoming' && dueDate && dueDate < new Date()) status = 'overdue';
        return { ...item, amount, paidAmount, status };
    }

    function nextInstallment(loan) {
        return (loan.installments || []).map(installmentView).find(item => item.status !== 'paid') || null;
    }

    function statusLabel(status) {
        return ({
            pending: 'Under review',
            approved: 'Approved',
            rejected: 'Not approved',
            disbursed: 'Disbursed',
            active: 'Active',
            repaid: 'Repaid'
        })[status] || 'Under review';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        })[character]);
    }

    function maskNrc(value) {
        const clean = String(value || '').trim();
        if (clean.length < 5) return clean || 'Not provided';
        return `${clean.slice(0, 2)}••••${clean.slice(-3)}`;
    }

    function applicationNumber(docId) {
        const now = new Date();
        const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        return `MT-${date}-${String(docId).slice(0, 6).toUpperCase()}`;
    }

    function loanIdFromUrl() {
        return new URLSearchParams(window.location.search).get('loan');
    }

    window.MoneyTreeLoans = {
        TEMP_RULES,
        CONTRACT_VERSION,
        number,
        roundMoney,
        money,
        toDate,
        formatDate,
        formatDateTime,
        dateInputValue,
        addMonths,
        calculateSchedule,
        buildContractTerms,
        calculateSalaryCapacity,
        maximumAffordablePrincipal,
        evaluateAffordability,
        applyPayment,
        loanSummary,
        installmentView,
        nextInstallment,
        statusLabel,
        escapeHtml,
        maskNrc,
        applicationNumber,
        loanIdFromUrl
    };
})();
