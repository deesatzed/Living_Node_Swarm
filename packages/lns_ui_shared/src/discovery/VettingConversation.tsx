export function VettingConversation({ provider, model, dataScope }: { provider: string; model: string; dataScope: string }) {
  return <section aria-labelledby="vetting-title">
    <h2 id="vetting-title">Vet the research brief</h2>
    <p>Record user claims, proposed interpretations, exclusions, scenarios, and unknowns before model structure is proposed.</p>
    <div><button>Pause</button><button>Proceed now</button><button>Ask another question</button><button>Add source</button><button>Add direction</button><button>Exclude direction</button><button>Correct understanding</button></div>
    <aside aria-label="Provider routing preview"><strong>{provider} · {model}</strong><p>{dataScope}</p><p>Routing requires explicit confirmation; fixture evidence never becomes live research.</p></aside>
  </section>;
}
