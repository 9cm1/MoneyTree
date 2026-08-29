(function () {
    'use strict';

    // TEMPORARY TEST VALUES. Replace these after the client approves the
    // official Money Tree credit policy. Every page reads from this object.
    const TEMP_RULES = Object.freeze({
        testMode: true,
        monthlyInterestRate: 0.02,
        arrangementFee: 0,
        monthlyAdminFee: 0,
        repaymentMethod: 'Manual payment',
        paymentFrequency: 'Monthly'
    });

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
        const principal = roundMoney(loan.approvedAmount || loan.amount);
        const legacyInterest = number(loan.interest);
        const totalRepay = roundMoney(loan.totalRepay || principal + legacyInterest + number(loan.totalFees));
        const totalPaid = roundMoney(loan.totalPaid);
        return {
            applicationNumber: loan.applicationNumber || 'Pending number',
            principal,
            disbursedAmount: roundMoney(loan.disbursedAmount || principal),
            totalInterest: roundMoney(loan.totalInterest || legacyInterest),
            totalFees: roundMoney(loan.totalFees),
            totalCostOfCredit: roundMoney(loan.totalCostOfCredit || legacyInterest + number(loan.totalFees)),
            totalRepay,
            totalPaid,
            remainingBalance: roundMoney(loan.remainingBalance != null ? loan.remainingBalance : Math.max(0, totalRepay - totalPaid)),
            termMonths: Math.max(1, Math.round(number(loan.termMonths, Math.ceil(number(loan.period, 30) / 30)))),
            monthlyInterestRate: number(loan.monthlyInterestRate, TEMP_RULES.monthlyInterestRate),
            annualPercentageRate: number(loan.annualPercentageRate, TEMP_RULES.monthlyInterestRate * 1200),
            repaymentMethod: loan.repaymentMethod || TEMP_RULES.repaymentMethod,
            paymentFrequency: loan.paymentFrequency || TEMP_RULES.paymentFrequency
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
        number,
        roundMoney,
        money,
        toDate,
        formatDate,
        dateInputValue,
        addMonths,
        calculateSchedule,
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
