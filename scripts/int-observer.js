const sections = document.querySelectorAll('.observe');

const options = {
	root: null,
	threshold: 0,
	rootMargin: '-100px',
};

const observer = new IntersectionObserver((entries, observer) => {
	entries.forEach((entry) => {
		if (!entry.isIntersecting) return;
		if (entry.target.classList.contains('about-flex'))
			document.querySelector('.nav-menu').classList.remove('active');
		if (!entry.target.classList.contains('about-flex'))
			observer.unobserve(entry.target);
	});
}, options);

sections.forEach((section) => {
	observer.observe(section);
});

// Fade-In
const faders = document.querySelectorAll('.fade-in');

const appearOptions = {
	threshold: 0,
	rootMargin: '0px 0px -250px 0px',
};

const appearOnScroll = new IntersectionObserver((entries, appearOnScroll) => {
	entries.forEach((entry) => {
		if (!entry.isIntersecting) return;
		entry.target.classList.add('appear');
		appearOnScroll.unobserve(entry.target);
	});
}, appearOptions);

faders.forEach((fader) => {
	appearOnScroll.observe(fader);
});

// Slide-In

const sliders = document.querySelectorAll('.slide-in');

sliders.forEach((slider) => {
	appearOnScroll.observe(slider);
});
