(function () {
	'use strict';

	function ShellMetric(props) {
		return h('div', { className: 'esti-shell-metric' },
			h('span', { className: 'esti-shell-metric__label' }, props.label),
			h('strong', { className: 'esti-shell-metric__value' }, props.value)
		);
	}

	function ModuleCard(props) {
		var card = props.card;
		var actionLabel = card.url ? props.openLabel : props.notReadyLabel;

		return h('article', { className: 'esti-module-card', 'data-module': card.key },
			h('div', { className: 'esti-module-card__header' },
				h('img', {
					alt: '',
					'aria-hidden': 'true',
					className: 'esti-module-card__pictogram',
					src: '/includes/carbon/pictograms/svg/' + (card.pictogram || 'build') + '.svg'
				}),
				h('span', { className: 'esti-module-card__status esti-module-card__status--' + (card.statusKey || 'planned') },
					h('img', {
						alt: '',
						'aria-hidden': 'true',
						className: 'esti-module-card__icon',
						src: '/includes/carbon/icons/svg/16/' + (card.icon || 'apps') + '.svg'
					}),
					card.status
				)
			),
			h('h2', { className: 'esti-module-card__title' }, card.label),
			h('p', { className: 'esti-module-card__description' }, card.description),
			card.url
				? h('a', { className: 'esti-carbon-button', href: card.url }, actionLabel)
				: h('button', { className: 'esti-carbon-button esti-carbon-button--disabled', disabled: true, type: 'button' }, actionLabel)
		);
	}

	function Workspace() {
		var labels = context.labels || {};
		var cards = context.cards || [];

		return h('main', { className: 'esti-react-shell' },
			h('section', { className: 'esti-workspace-header' },
				h('div', { className: 'esti-workspace-header__copy' },
					h('p', { className: 'esti-eyebrow' }, context.eyebrow || ''),
					h('h1', null, context.headline || context.appName || 'ESTI'),
					h('p', { className: 'esti-workspace-header__summary' }, context.summary || '')
				),
				h('aside', { className: 'esti-workspace-status', 'aria-label': labels.workspaceStatus },
					h(ShellMetric, { label: labels.backendMode, value: labels.backendModeValue }),
					h(ShellMetric, { label: labels.gridSystem, value: labels.gridSystemValue }),
					h(ShellMetric, { label: labels.uiLibrary, value: labels.uiLibraryValue })
				)
			),
			h('section', { className: 'esti-module-grid', 'aria-label': labels.migrationLane },
				cards.map(function (card) {
					return h(ModuleCard, { card: card, key: card.key, notReadyLabel: labels.notReady, openLabel: labels.open });
				})
			)
		);
	}

	function bootstrap() {
		var rootNode = document.getElementById('esti-react-root');
		if (!rootNode || !window.React || !window.ReactDOM) {
			return;
		}

		window.ESTIReactContext = {};

		try {
			window.ESTIReactContext = JSON.parse(rootNode.getAttribute('data-context') || '{}');
		} catch (error) {
			window.ESTIReactContext = {};
		}

		window.ReactDOM.createRoot(rootNode).render(h(Workspace));
	}

	var h = window.React.createElement;
	var context = {};

	Object.defineProperty(window, 'ESTIReactContext', {
		configurable: true,
		get: function () {
			return context;
		},
		set: function (value) {
			context = value || {};
		}
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootstrap);
	} else {
		bootstrap();
	}
}());
