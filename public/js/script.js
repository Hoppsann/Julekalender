const input = document.getElementById('dato');
    const luker = document.querySelectorAll('.luke');

    input.addEventListener('input', () => {
    const valgtDag = Number(input.value);

    luker.forEach(luke => {
        const lukeDag = Number(luke.dataset.dag);

        luke.classList.remove('aktiv', 'idag', 'fremtid');

        if (!valgtDag) return;

        if (lukeDag < valgtDag) {
        luke.classList.add('aktiv');
        } else if (lukeDag === valgtDag) {
        luke.classList.add('idag');
        } else if (lukeDag > valgtDag) {
        luke.classList.add('fremtid');
        }
    });
    });
