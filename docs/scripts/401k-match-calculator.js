// 401k-match-calculator.js
// Copyright (c) 2026 Ishan Pranav

const payrollSelect = document.getElementById('payrollSelect');
const matchPercentageInput = document.getElementById('matchPercentageInput');

function createTableRow(index) {
    const tableRow = document.createElement('tr');

    tableRow.innerHTML = `
        <th scope="row" class="align-middle">${index + 1}</th>
        <td>
            <label class="ishan-stack-hide col-form-label">Eligible compensation</label>
            <div class="input-group input-group-sm">
                <span class="input-group-text">$</span>
                <input type="text"
                       class="form-control text-end"
                       id="pay${index}Input"
                       aria-label="Eligible compensation" />
            </div>
        </td>
        <td>
            <label class="ishan-stack-hide col-form-label">Contribution percentage</label>
            <div class="input-group input-group-sm">
                <input type="number"
                       class="form-control text-end"
                       id="percentage${index}Input"
                       min="0"
                       max="100"
                       aria-label="Contribution percentage" />
                <span class="input-group-text">%</span>
            </div>
        </td>
        <td>
            <label class="ishan-stack-hide col-form-label">Employee contribution</label>
            <div class="input-group input-group-sm">
                <span class="input-group-text">$</span>
                <input type="text"
                       class="form-control text-end"
                       id="contribution${index}Input"
                       min="0.00"
                       step="0.01"
                       aria-label="Employee contribution" />
            </div>
        </td>
        <td>
            <label class="ishan-stack-hide col-form-label">Matching contribution</label>
            <div class="input-group input-group-sm">
                <span class="input-group-text">$</span>
                <input type="text"
                       class="form-control text-end"
                       id="match${index}Input"
                       min="0.00"
                       step="0.01"
                       disabled="disabled"
                       aria-label="Matching contribution"
                       aria-disabled="true" />
            </div>
        </td>
    `;

    return tableRow;
}

function unformatCurrency(value) {
    value = value.toString();

    if (value === "") {
        return 0;
    }

    const dollars = parseFloat(value.replace(/,/g, ""));

    if (isNaN(dollars)) {
        return 0;
    }

    return Math.round(dollars * 100);
}

function formatCurrency(cents) {
    if (typeof cents === 'string') {
        cents = unformatCurrency(cents);
    }

    if (isNaN(cents)) {
        return "";
    }

    const dollars = cents / 100;

    return dollars.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function addCurrencyMask(input) {
    input.value = formatCurrency(unformatCurrency(input.value));
    input.addEventListener('blur', () => {
        if (input.value !== "") {
            input.value = formatCurrency(unformatCurrency(input.value));
        }
    });
    input.addEventListener('focus', () => {
        const cents = unformatCurrency(input.value);
        input.value = cents > 0 ? (cents / 100).toString() : "";
    });
}

function calculate(
    annualLimitCents,
    matchPercentage,
    maxPercentage,
    paychecksCents,
    strategy) {
    const n = paychecksCents.length;
    const percentages = Array(n).fill(0);
    const reserved = Array(n).fill(0);

    reserved[n - 1] = 0;

    for (let i = n - 2; i >= 0; i--) {
        reserved[i] = reserved[i + 1] +
            Math.floor(paychecksCents[i + 1] * matchPercentage / 100);
    }

    let remainingLimitCents = annualLimitCents;

    if (strategy === 'uniform') {
        let p = matchPercentage;

        while (true) {
            const totalCents = paychecksCents.reduce(
                (sum, paycheckCents) =>
                    sum + Math.floor(paycheckCents * (p + 1) / 100),
                0
            );

            if (totalCents > annualLimitCents || p + 1 > maxPercentage) break;

            p++;
        }

        for (let i = 0; i < n; i++) {
            percentages[i] = p;
            remainingLimitCents -= Math.floor(paychecksCents[i] * p / 100);
        }

        for (let i = 0; i < n && remainingLimitCents > 0; i++) {
            const extraCents = Math.floor(paychecksCents[i] / 100);

            if (percentages[i] < maxPercentage && extraCents <= remainingLimitCents) {
                percentages[i]++;
                remainingLimitCents -= extraCents;
            }
        }

        return percentages;
    }

    for (let i = 0; i < n; i++) {
        const availableCents = remainingLimitCents - reserved[i];
        let percentage;

        if (strategy === 'frontload') {
            percentage = Math.floor((availableCents * 100) / paychecksCents[i]);
        }
        else if (strategy === 'dca') {
            const targetPerPaycheckCents = Math.floor(availableCents / (n - i));
            percentage = Math.floor((targetPerPaycheckCents * 100) / paychecksCents[i]);
        }

        percentage = Math.min(percentage, maxPercentage);
        percentage = Math.max(percentage, matchPercentage);

        const ceilingPercentage = Math.floor((remainingLimitCents * 100) / paychecksCents[i]);

        if (percentage > ceilingPercentage) {
            percentage = ceilingPercentage;
        }

        percentages[i] = percentage;
        remainingLimitCents -= Math.floor(paychecksCents[i] * percentage / 100);

        if (remainingLimitCents <= 0) {
            break;
        }
    }

    return percentages;
}

function updateContribution(
    payInput,
    percentageInput,
    contributionInput) {
    const payCents = unformatCurrency(payInput.value);
    const percentage = percentageInput.value;
    const contributionCents = Math.floor(payCents * percentage / 100);

    contributionInput.value = formatCurrency(contributionCents);
}

function updatePercentage(
    payInput,
    percentageInput,
    contributionInput) {
    const payCents = unformatCurrency(payInput.value);
    const contributionCents = unformatCurrency(contributionInput.value);

    if (payCents === 0) {
        percentageInput.value = 0;
        return;
    }

    const percentage = Math.floor((contributionCents * 100) / payCents);

    if (percentage > 100) {
        percentageInput.value = 100;

        updateContribution(
            payInput,
            percentageInput,
            contributionInput);

        return;
    }

    percentageInput.value = percentage;
}

function updateMatch(
    payInput,
    contributionInput,
    matchInput) {
    const payCents = unformatCurrency(payInput.value);
    const contributionCents = unformatCurrency(contributionInput.value);
    const matchCents = Math.min(
        Math.floor(payCents * matchPercentageInput.value / 100),
        contributionCents
    );

    matchInput.value = formatCurrency(matchCents);
}

function updateTotals(paychecksCents, percentages) {
    let payCents = 0;
    let contributionCents = 0;
    let matchCents = 0;

    for (let i = 0; i < paychecksCents.length; i++) {
        payCents += paychecksCents[i];
        contributionCents += Math.floor(paychecksCents[i] * percentages[i] / 100);
        matchCents += Math.floor(paychecksCents[i] * Math.min(matchPercentageInput.value, percentages[i]) / 100);
    }

    const percentage = payCents > 0 ? (contributionCents * 100) / payCents : 0;

    document.getElementById('payInput').value = formatCurrency(payCents);
    document.getElementById('percentageInput').value = Math.round(percentage * 100) / 100;
    document.getElementById('contributionInput').value = formatCurrency(contributionCents);
    document.getElementById('matchInput').value = formatCurrency(matchCents);
}

function addUpdateContribution(
    input,
    payInput,
    percentageInput,
    contributionInput) {
    input.addEventListener('change', () => {
        updateContribution(
            payInput,
            percentageInput,
            contributionInput);
    });
}

function addUpdatePercentage(
    input,
    payInput,
    percentageInput,
    contributionInput) {
    input.addEventListener('change', () => {
        updatePercentage(
            payInput,
            percentageInput,
            contributionInput);
    });
}

function addUpdateMatch(
    input,
    payInput,
    contributionInput,
    matchInput
) {
    input.addEventListener('change', () => {
        updateMatch(
            payInput,
            contributionInput,
            matchInput
        );
    })
}

function updateTotal() {
    const paychecksCents = [];
    const percentages = [];
    const n = parseInt(payrollSelect.value);

    for (let i = 0; i < n; i++) {
        const payInput = document.getElementById(`pay${i}Input`);
        const percentageInput = document.getElementById(`percentage${i}Input`);

        paychecksCents.push(unformatCurrency(payInput.value));
        percentages.push(percentageInput.value);
    }

    updateTotals(paychecksCents, percentages);
}

function addUpdateTotal(input) {
    input.addEventListener('change', () => {
        updateTotal();
    });
}

function updateStrategyText() {
    const strategy = strategySelect.value;

    document.getElementById('strategyText').innerHTML = getDescription(strategy);
}

function updateCalculated(paychecksCents, percentages) {
    const n = parseInt(payrollSelect.value);

    for (let i = 0; i < n; i++) {
        const payInput = document.getElementById(`pay${i}Input`);
        const percentageInput = document.getElementById(`percentage${i}Input`);
        const contributionInput = document.getElementById(`contribution${i}Input`);
        const matchInput = document.getElementById(`match${i}Input`);

        percentageInput.value = percentages[i];

        updateContribution(
            payInput,
            percentageInput,
            contributionInput);
        updateMatch(
            payInput,
            contributionInput,
            matchInput);
        updateTotals(paychecksCents, percentages);
    }
}

function getDescription(strategy) {
    if (strategy === 'frontload') {
        return `Frontloading attempts to contribute as much as
        possible, as early in the year as possible, while maximizing the
        employer match.`;
    }

    if (strategy === 'dca') {
        return `Dollar-cost averaging attempts to make roughly
        equal contributions throughout the year, while maximizing the
        employer match.`;
    }

    if (strategy == 'uniform') {
        return `Uniform-percentage contribution attempts to invest a
        consistent portion of gross pay. This is useful for choosing and setting
        a single deduction rate at the beginning of the year.`;
    }

    return "";
}

function addCascade(prefix, i) {
    const current = document.getElementById(`${prefix}${i}Input`);

    current.addEventListener('change', () => {
        const n = parseInt(payrollSelect.value);

        if (current.value === "" || !current.value || current.value === '0.00') {
            return;
        }

        const next = document.getElementById(`${prefix}${i + 1}Input`);

        if (!next || next.value !== "" && next.value && next.value !== '0.00') {
            return;
        }

        next.value = formatCurrency(unformatCurrency(current.value));

        next.dispatchEvent(new Event('change'));
    });
}

function updatePayroll() {
    const paycheckTableBody = document.getElementById('paycheckTableBody');

    paycheckTableBody.innerHTML = "";

    for (let i = 0; i < payrollSelect.value; i++) {
        paycheckTableBody.appendChild(createTableRow(i));

        const payInput = document.getElementById(`pay${i}Input`);
        const percentageInput = document.getElementById(`percentage${i}Input`);
        const contributionInput = document.getElementById(`contribution${i}Input`);
        const matchInput = document.getElementById(`match${i}Input`);

        addCurrencyMask(payInput);
        addCurrencyMask(contributionInput);
        addUpdateContribution(
            payInput,
            payInput,
            percentageInput,
            contributionInput);
        addUpdateContribution(
            percentageInput,
            payInput,
            percentageInput,
            contributionInput);
        addUpdatePercentage(
            payInput,
            payInput,
            percentageInput,
            contributionInput);
        addUpdatePercentage(
            contributionInput,
            payInput,
            percentageInput,
            contributionInput);
        addUpdateMatch(
            payInput,
            payInput,
            contributionInput,
            matchInput
        );
        addUpdateMatch(
            contributionInput,
            payInput,
            contributionInput,
            matchInput
        );
        addUpdateMatch(
            matchPercentageInput,
            payInput,
            contributionInput,
            matchInput
        );
        addUpdateTotal(payInput);
        addUpdateTotal(percentageInput);
        addUpdateTotal(contributionInput);
        addCascade('pay', i);
        addCascade('contribution', i);
    }

    updateTotal();
}

payrollSelect.addEventListener('change', () => {
    updatePayroll();
});

const annualLimitInput = document.getElementById('annualLimitInput');

addCurrencyMask(annualLimitInput);

const strategySelect = document.getElementById('strategySelect');
const maxPercentageInput = document.getElementById('maxPercentageInput');

strategySelect.addEventListener('change', () => {
    updateStrategyText();
});

document.getElementById('calculateButton').addEventListener('click', () => {
    const n = parseInt(payrollSelect.value);
    const annualLimitCents = unformatCurrency(annualLimitInput.value);
    const paychecksCents = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        const payInput = document.getElementById(`pay${i}Input`).value;

        paychecksCents[i] = unformatCurrency(payInput);
    }

    const percentages = calculate(
        annualLimitCents,
        matchPercentageInput.value,
        maxPercentageInput.value,
        paychecksCents,
        strategySelect.value);

    updateCalculated(paychecksCents, percentages);
});

strategySelect.value = 'frontload';

updateStrategyText();

payrollSelect.value = 4;

updatePayroll();

matchPercentageInput.value = 4;
maxPercentageInput.value = 75;
annualLimitInput.value = formatCurrency(2450000);

const paychecksCents = [2333333, 833333, 833333, 833333];
const annualLimitCents = unformatCurrency(annualLimitInput.value);
const percentages = calculate(
    annualLimitCents,
    matchPercentageInput.value,
    maxPercentageInput.value,
    paychecksCents,
    strategySelect.value);
const n = parseInt(payrollSelect.value);

for (let i = 0; i < n; i++) {
    const payInput = document.getElementById(`pay${i}Input`);

    payInput.value = formatCurrency(paychecksCents[i]);
}

updateCalculated(paychecksCents, percentages);
