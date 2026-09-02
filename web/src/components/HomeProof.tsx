export function HomeProof() {
  return (
    <section id="proof" className="proof" aria-labelledby="proof-heading">
      <h2 id="proof-heading">Before and after one miss</h2>
      <p className="proof-lead">
        Same user prompt. Without a case file you get a confident guess. With EDD you get a failing
        assert, a report, and a merge gate.
      </p>
      <p className="proof-prompt">“What is the database for the payment system?”</p>
      <ul className="proof-grid">
        <li className="proof-col before">
          <h3>Before: eyeball the chat</h3>
          <dl>
            <dt>Agent</dt>
            <dd>“Typically payment systems use PostgreSQL…”</dd>
            <dt>Tool call</dt>
            <dd>None</dd>
            <dt>You ship</dt>
            <dd>A hallucination that looks polite</dd>
            <dt>How you notice</dt>
            <dd>A human scrolls the transcript, or a customer does</dd>
          </dl>
        </li>
        <li className="proof-col after">
          <h3>After: demo eval suite</h3>
          <dl>
            <dt>Case</dt>
            <dd>
              <code>demo-edge</code> expects <code>read_architecture_yaml</code> + <code>payment-api</code>
            </dd>
            <dt>Red</dt>
            <dd>
              <code>FAIL tool_selection</code>: no tool, conversational reply
            </dd>
            <dt>Green</dt>
            <dd>Tighten prompt/schema; same case passes</dd>
            <dt>Gate</dt>
            <dd>
              <code>kit eval ci --suite evals/edd/demo.yaml --threshold-routing 95</code>
            </dd>
          </dl>
        </li>
      </ul>
      <nav className="proof-follow" aria-label="Proof follow-ups">
        <ul className="edd-links">
          <li>
            <a href="#demo">Walk the interactive demo</a>
          </li>
          <li>
            <a href="/evals/edd/examples/before-after">Full before/after write-up</a>
          </li>
          <li>
            <a href="/evals/edd/demo.yaml">Demo suite</a>
          </li>
        </ul>
      </nav>
    </section>
  );
}
