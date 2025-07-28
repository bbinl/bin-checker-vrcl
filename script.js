let stopChecking = false;

document.addEventListener('DOMContentLoaded', () => {
    const getBinsBtn = document.getElementById('get-bins-btn');
    const countrySelect = document.getElementById('country-select');
    const binAmountInput = document.getElementById('bin-amount');
    const numbersTextarea = document.getElementById("numbers");
    const checkBtn = document.getElementById("check-btn");
    const stopCheckBtn = document.getElementById("stop-check-btn");
    const resultOutputTextarea = document.getElementById("result-output");
    const liveNumbersTextarea = document.getElementById("ali-numbers");
    const deadNumbersTextarea = document.getElementById("muhammad-numbers");
    const liveCountSpan = document.getElementById("ali-count");
    const deadCountSpan = document.getElementById("muhammad-count");

    let liveCount = 0;
    let deadCount = 0;

    async function fetchCountries() {
        try {
            const response = await fetch('/api/countries');
            const countries = await response.json();
            countries.sort((a, b) => a.name.localeCompare(b.name));
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = `${country.name} (${country.code})`;
                countrySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to fetch countries:', error);
        }
    }

    async function getRandomBins() {
        const country = countrySelect.value;
        const limit = binAmountInput.value;
        let url = `/api/random-bins?limit=${limit}`;
        if (country) {
            url += `&country=${country}`;
        }

        try {
            const response = await fetch(url);
            const bins = await response.text();
            numbersTextarea.value = bins;
            Swal.fire("Success", "Random BINs have been loaded.", "success");
        } catch (error) {
            console.error('Failed to fetch random BINs:', error);
            Swal.fire("Error", "Could not fetch random BINs.", "error");
        }
    }

    fetchCountries();
    getBinsBtn.addEventListener('click', getRandomBins);
    checkBtn.addEventListener("click", startChecking);
    stopCheckBtn.addEventListener("click", stopCheckingProcess);

    function toggleButtons(isChecking) {
        checkBtn.disabled = isChecking;
        stopCheckBtn.disabled = !isChecking;
    }

    function stopCheckingProcess() {
        stopChecking = true;
        toggleButtons(false);
        Swal.fire("Checking Stopped", "BIN checking has been stopped.", "info");
    }

    async function startChecking() {
        stopChecking = false;
        toggleButtons(true);

        const input = numbersTextarea.value.trim();
        const bins = input.split("\n").filter(line => line.trim().length >= 6);

        resultOutputTextarea.value = "";
        liveNumbersTextarea.value = "";
        deadNumbersTextarea.value = "";
        liveCount = 0;
        deadCount = 0;
        updateSummaryCounts();

        if (bins.length === 0) {
            Swal.fire("No BINs", "Please enter valid BINs (at least 6 digits), one per line.", "info");
            toggleButtons(false);
            return;
        }

        appendToStatusOutput(`⏳ Starting check of ${bins.length} BINs...\n`);

        const response = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bins })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentIndex = 0;

        while (!stopChecking) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop(); 

            for (const chunk of lines) {
                if (stopChecking) break;

                if (chunk.startsWith('event: done')) {
                    if (!stopChecking) {
                        appendToStatusOutput(
                            `\n✅ Checking Finished!\n` +
                            `Total: ${bins.length}\n🟢 Valid: ${liveCount}\n🔴 Invalid: ${deadCount}`
                        );
                        Swal.fire("Done", "All BINs checked.", "success");
                    }
                    toggleButtons(false);
                    return;
                }

                if (chunk.startsWith('data:')) {
                    currentIndex++;
                    const raw = chunk.replace(/^data:\s*/, '');
                    const data = JSON.parse(raw);
                    
                    appendToStatusOutput(`➡️ Checking BIN ${currentIndex} of ${bins.length}... ${data.originalBin}`);

                    if (data.bin) {
                        liveCount++;
                        const resultLine = `BIN: ${data.bin} ✅ Valid\n\nBrand     : ${data.brand || 'N/A'}   |  Type      : ${data.type || 'N/A'}   |   Category  : ${data.category || 'N/A'} \nIssuer    : ${data.issuer || 'N/A'}\nCountry   : ${data.country_name || 'N/A'} 🇦🇮 (${data.country_code || 'N/A'})\n\n`;
                        appendResultToSpecificOutput(liveNumbersTextarea, resultLine);
                        appendToStatusOutput(` ${data.originalBin} ✅ Valid`);
                    } else {
                        deadCount++;
                        const resultLine = `BIN: ${data.originalBin} ❌ Invalid\nNo data found\n\n`;
                        appendResultToSpecificOutput(deadNumbersTextarea, resultLine);
                        appendToStatusOutput(` ${data.originalBin} ❌ Invalid`);
                    }
                    updateSummaryCounts();
                }
            }
        }
        if (stopChecking) {
             appendToStatusOutput(`\n🛑 Checking stopped by user.`);
        }
    }

    function appendToStatusOutput(text) {
        resultOutputTextarea.value += text + '\n';
        resultOutputTextarea.scrollTop = resultOutputTextarea.scrollHeight;
    }

    function appendResultToSpecificOutput(textareaElement, text) {
        textareaElement.value += text;
        textareaElement.scrollTop = textareaElement.scrollHeight;
    }

    function updateSummaryCounts() {
        liveCountSpan.textContent = liveCount;
        deadCountSpan.textContent = deadCount;
    }

    window.copyToClipboard = function (elementId) {
        const textareaElement = document.getElementById(elementId);
        if (textareaElement && textareaElement.value) {
            navigator.clipboard.writeText(textareaElement.value).then(() => {
                Swal.fire("Copied!", "Content copied to clipboard.", "success");
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                Swal.fire("Error", "Could not copy text.", "error");
            });
        } else {
            Swal.fire("No Content", "The section is empty.", "info");
        }
    }
});
