import { useState } from "react";
import { formatCurrency, formatPercentage } from "../utils/format";
import { applyTax, applyGain, getAvgTaxRate, getGain } from "../utils/finance";
import { getFundTax, getFundTaxSaving, MAX_DEDUCTIBLE } from "../utils/tfr";

import "./Tfr.css";

const Tfr: React.FC = () => {
  const [ral, setRal] = useState<number>(28000);
  const [apr, setApr] = useState<number>(3);
  const [inflation, setInflation] = useState<number>(2);
  const [ddlContribution, setDdlContribution] = useState<number>(1.55);
  const [minVoluntaryContribution, setMinVoluntaryContribution] = useState<number>(0.55);
  const [monthlyVoluntaryContribution, setMonthlyVoluntaryContribution] = useState<number>(0);
  const [years, setYears] = useState<number>(35);
  const [pacApr, setPacApr] = useState<number>(6);

  const INPS_REEVAL_TAX = 0.17;
  const INPS_GROSS_REEVAL = 0.015 + 0.75 * (inflation / 100);
  const INPS_NET_REEVAL = applyTax(INPS_GROSS_REEVAL, INPS_REEVAL_TAX);

  const FPN_COST = 0.00395;
  const FPA_COST = 0.014525;
  const PIP_COST = 0.022625;

  const PAC_TAX = 0.26;
  const PAC_COST = 0.004;

  const annualTfrContribution = ral / 13.5;
  const totalTfrContribution = annualTfrContribution * years;

  const voluntaryContribution = monthlyVoluntaryContribution > 0;
  const annualVoluntaryContribution = monthlyVoluntaryContribution * 12;
  const totalVoluntaryContribution = annualVoluntaryContribution * years;

  const annualMinVoluntaryContribution = (minVoluntaryContribution / 100) * ral;
  const minVoluntaryContributionAmount = ((minVoluntaryContribution / 100) * ral) / 12;
  const totalMinVoluntaryContribution = annualMinVoluntaryContribution * years;

  const annualDdlContribution = voluntaryContribution ? (ddlContribution / 100) * ral : 0;
  const totalDdlContribution = annualDdlContribution * years;

  const annualMinContribution = voluntaryContribution ? annualMinVoluntaryContribution + annualDdlContribution : 0;

  const getInpsLiquidation = () => {
    let tfr = 0;

    for (let y = 1; y <= years; y++) {
      tfr = applyGain(tfr, INPS_NET_REEVAL);
      tfr += annualTfrContribution;
    }

    return applyTax(tfr, getAvgTaxRate(ral));
  };

  const getFundLiquidation = (cost: number, annualContribution = 0) => {
    const gainPercent = apr / 100;
    const netGain = applyTax(gainPercent - cost, 0.2);
    let tfr = 0;

    for (let y = 1; y <= years; y++) {
      tfr = applyGain(tfr, netGain);
      tfr += annualTfrContribution + annualContribution;
    }

    return applyTax(tfr, getFundTax(years));
  };

  const getFpnGain = () => {
    const tfr =
      totalTfrContribution +
      totalVoluntaryContribution -
      getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution);
    const fund = getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution);
    return getGain(tfr, fund, years);
  };

  const getFpaGain = () => {
    const tfr = totalTfrContribution + totalVoluntaryContribution - getFundTaxSaving(ral, annualVoluntaryContribution);
    const fund = getFundLiquidation(FPA_COST, annualVoluntaryContribution);
    return getGain(tfr, fund, years);
  };

  const getPipGain = () => {
    const tfr = totalTfrContribution + totalVoluntaryContribution - getFundTaxSaving(ral, annualVoluntaryContribution);
    const fund = getFundLiquidation(PIP_COST, annualVoluntaryContribution);
    return getGain(tfr, fund, years);
  };

  const getPacLiquidation = (annualContribution: number) => {
    const gainPercent = pacApr / 100;
    let totalContribution = 0;
    let pac = 0;

    for (let y = 1; y <= years; y++) {
      pac = applyGain(pac, gainPercent - PAC_COST);
      totalContribution += annualContribution;
      pac += annualContribution;
    }

    return totalContribution + applyTax(pac - totalContribution, PAC_TAX);
  };

  const fpnAndPacLiquidation =
    getPacLiquidation(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution)) +
    getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution);

  const fpnMaxAndPacLiquidation =
    getPacLiquidation(
      getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution) +
        Math.max(annualVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution), 0)
    ) + getFundLiquidation(FPN_COST, Math.min(annualVoluntaryContribution + annualDdlContribution, MAX_DEDUCTIBLE));

  const fpnMinAndPacLiquidation =
    getPacLiquidation(
      getFundTaxSaving(ral, annualMinContribution) +
        Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0)
    ) + getFundLiquidation(FPN_COST, annualMinContribution);

  const fpnZeroAndPacLiquidation = getPacLiquidation(annualVoluntaryContribution) + getFundLiquidation(FPN_COST);

  return (
    <div>
      <h2>Sai dove finisce il tuo TFR?</h2>
      <p>
        Il TFR (Trattamento di Fine Rapporto) è una somma che il datore di lavoro (DdL) accantona ogni anno per il
        dipendente, come una sorta di "liquidazione" o risparmio forzato. Coincide a circa 1/13,5 della RAL
        (Retribuzione Annua Lorda). Può restare in azienda (o essere versato all'INPS se l'azienda ha più di 50
        dipendenti) ed essere liquidato al termine del rapporto di lavoro, oppure essere destinato a un fondo pensione
        per integrare la pensione futura.
      </p>
      <p>
        I fondi pensione sono soggetti a tassazione agevolata e permettono di dedurre i contributi versati dal reddito
        imponibile, riducendo così le tasse (IRPEF) da pagare. Esistono diversi tipi di fondi pensione, ognuno con costi
        e rendimenti diversi. In questo calcolatore puoi confrontare il rendimento del TFR se lasciato in azienda (o
        versato al Fondo Tesoreria INPS) con quello di un fondo pensione negoziale (FPN), di un fondo pensione aperto
        (FPA) e di un piano individuale pensionistico (PIP). Puoi anche vedere il rendimento di un PAC (Piano di
        Accumulo del Capitale) in ETF se investi il contributo volontario in un PAC invece che in un fondo pensione. Il
        TFR pregresso è trasferibile al fondo pensione solo se l'azienda ha meno di 50 dipendenti.
      </p>
      <p>
        Nei calcoli qui sotto, per i fondi pensione vengono considerati i costi medi dei vari profili di rischio. Per il
        PAC viene considerato un costo dello {formatPercentage(PAC_COST)}.
      </p>
      <div className="alert">
        <p>
          Le informazioni fornite hanno solo scopo informativo e non costituiscono consulenza finanziaria. Non mi assumo
          responsabilità per eventuali errori nei calcoli o interpretazioni. Prima di prendere decisioni, è sempre
          consigliabile fare le proprie verifiche o consultare un professionista qualificato.
        </p>
      </div>
      <div className="input-group">
        <label htmlFor="ral">
          RAL <span className="mu">€</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setRal((prev) => Math.max(0, prev - 1000))}>
            −
          </button>
          <input
            id="ral"
            type="number"
            value={ral}
            step={1000}
            min={0}
            onChange={(e) => setRal(Number(e.target.value))}
            placeholder="RAL"
          />
          <button type="button" onClick={() => setRal((prev) => Math.max(0, prev + 1000))}>
            +
          </button>
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="apr">
          Rendimento lordo fondo <span className="mu">%/anno</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setApr((prev) => Math.max(0, prev - 0.5))}>
            −
          </button>
          <input
            id="apr"
            type="number"
            value={apr}
            step={0.5}
            min={0}
            onChange={(e) => setApr(Number(e.target.value))}
            placeholder="Rendimento medio annuo"
          />
          <button type="button" onClick={() => setApr((prev) => Math.max(0, prev + 0.5))}>
            +
          </button>
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="inflation">
          Inflazione <span className="mu">%/anno</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setInflation((prev) => Math.max(0, prev - 0.5))}>
            −
          </button>
          <input
            id="inflation"
            type="number"
            value={inflation}
            step={0.5}
            min={0}
            onChange={(e) => setInflation(Number(e.target.value))}
            placeholder="Inflazione media annua"
          />
          <button type="button" onClick={() => setInflation((prev) => Math.max(0, prev + 0.5))}>
            +
          </button>
        </div>
      </div>

      <h3>Hai dei risparmi mensili?</h3>
      <p>
        Il <strong>contributo volontario</strong> al fondo pensione è una somma aggiuntiva che il lavoratore può versare
        liberamente, anche minima, per aumentare la propria pensione integrativa. Questo contributo è{" "}
        <strong>deducibile fiscalmente fino a {formatCurrency(MAX_DEDUCTIBLE)} l'anno</strong>, riducendo l'IRPEF da
        pagare. Inoltre, in molti fondi <strong>negoziali</strong>, versare anche solo il minimo previsto dal contratto
        attiva automaticamente il <strong>contributo aggiuntivo del datore di lavoro</strong>, un'opportunità
        vantaggiosa che rende l'adesione ancora più conveniente.
      </p>
      <div className="input-group">
        <label htmlFor="ddlContribution">
          Contributo FPN Datore di Lavoro <span className="mu">RAL %/anno</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setDdlContribution((prev) => Math.max(0, prev - 0.05))}>
            −
          </button>
          <input
            id="ddlContribution"
            type="number"
            value={ddlContribution}
            step={0.05}
            min={0}
            onChange={(e) => setDdlContribution(Number(e.target.value))}
            placeholder="Contributo DdL"
          />
          <button type="button" onClick={() => setDdlContribution((prev) => Math.max(0, prev + 0.05))}>
            +
          </button>
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="minVoluntaryContribution">
          Contributo volontario minimo <span className="mu">RAL %/anno</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setMinVoluntaryContribution((prev) => Math.max(0, prev - 0.05))}>
            −
          </button>
          <input
            id="minVoluntaryContribution"
            type="number"
            value={minVoluntaryContribution}
            step={0.05}
            min={0}
            onChange={(e) => setMinVoluntaryContribution(Number(e.target.value))}
            placeholder="Contributo volontario minimo"
          />
          <button type="button" onClick={() => setMinVoluntaryContribution((prev) => Math.max(0, prev + 0.05))}>
            +
          </button>
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="monthlyVoluntaryContribution">
          Capacità di risparmio mensile <span className="mu">€/mese</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setMonthlyVoluntaryContribution((prev) => Math.max(0, prev - 20))}>
            −
          </button>
          <input
            id="monthlyVoluntaryContribution"
            type="number"
            value={monthlyVoluntaryContribution}
            step={minVoluntaryContributionAmount}
            min={0}
            onChange={(e) => setMonthlyVoluntaryContribution(Number(e.target.value))}
            placeholder="Contributo volontario mensile"
          />
          <button type="button" onClick={() => setMonthlyVoluntaryContribution((prev) => Math.max(0, prev + 20))}>
            +
          </button>
        </div>
      </div>
      <div className="alert alert-info">
        <p>
          Attivi il <strong>contributo aggiuntivo del DdL</strong> se versi almeno{" "}
          {formatCurrency(minVoluntaryContributionAmount)}.
        </p>
        <p>Massimo importo deducibile FPN: {formatCurrency((MAX_DEDUCTIBLE - (ddlContribution / 100) * ral) / 12)}</p>
        <p>Massimo importo deducibile FPA/PIP: {formatCurrency(MAX_DEDUCTIBLE / 12)}</p>
      </div>

      <h3>E dopo {years} anni...</h3>
      <div className="input-group">
        <label htmlFor="years">Anni</label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setYears((prev) => Math.max(1, prev - 1))}>
            −
          </button>
          <input
            id="years"
            type="number"
            value={years}
            step={1}
            min={1}
            max={42}
            onChange={(e) => setYears(Number(e.target.value))}
            placeholder="Anni"
          />
          <button type="button" onClick={() => setYears((prev) => Math.max(1, prev + 1))}>
            +
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Destinazione</th>
              <th>TFR versato</th>
              <th>Contributo volontario</th>
              <th>Contributo DdL</th>
              <th>Risparmio IRPEF</th>
              <th>Tasse liquidazione</th>
              <th>Netto</th>
              <th>Rendimento netto</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className={
                getInpsLiquidation() >=
                  getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) &&
                getInpsLiquidation() >= getFundLiquidation(FPA_COST, annualVoluntaryContribution) &&
                getInpsLiquidation() >= getFundLiquidation(PIP_COST, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>INPS/azienda</td>
              <td>{formatCurrency(totalTfrContribution)}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>{formatPercentage(getAvgTaxRate(ral))}</td>
              <td>{formatCurrency(getInpsLiquidation())}</td>
              <td>{formatPercentage(getGain(totalTfrContribution, getInpsLiquidation(), years))}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) >=
                  getInpsLiquidation() &&
                getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) >=
                  getFundLiquidation(FPA_COST, annualVoluntaryContribution) &&
                getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) >=
                  getFundLiquidation(PIP_COST, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>FPN</td>
              <td>{formatCurrency(totalTfrContribution)}</td>
              <td>{formatCurrency(totalVoluntaryContribution)}</td>
              <td>{formatCurrency(voluntaryContribution ? totalDdlContribution : 0)}</td>
              <td>
                {formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years))}
              </td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>
                {formatCurrency(getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution))}
              </td>
              <td>{formatPercentage(getFpnGain())}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(FPA_COST, annualVoluntaryContribution) >= getInpsLiquidation() &&
                getFundLiquidation(FPA_COST, annualVoluntaryContribution) >=
                  getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) &&
                getFundLiquidation(FPA_COST, annualVoluntaryContribution) >=
                  getFundLiquidation(PIP_COST, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>FPA</td>
              <td>{formatCurrency(totalTfrContribution)}</td>
              <td>{formatCurrency(totalVoluntaryContribution)}</td>
              <td>-</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution, years))}</td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>{formatCurrency(getFundLiquidation(FPA_COST, annualVoluntaryContribution))}</td>
              <td>{formatPercentage(getFpaGain())}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(PIP_COST, annualVoluntaryContribution) >= getInpsLiquidation() &&
                getFundLiquidation(PIP_COST, annualVoluntaryContribution) >=
                  getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution) &&
                getFundLiquidation(PIP_COST, annualVoluntaryContribution) >=
                  getFundLiquidation(FPA_COST, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>PIP</td>
              <td>{formatCurrency(totalTfrContribution)}</td>
              <td>{formatCurrency(totalVoluntaryContribution)}</td>
              <td>-</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution, years))}</td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>{formatCurrency(getFundLiquidation(PIP_COST, annualVoluntaryContribution))}</td>
              <td>{formatPercentage(getPipGain())}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>E se investi il contributo volontario in un PAC?</h3>
      <div className="input-group">
        <label htmlFor="pacApr">
          Rendimento lordo PAC <span className="mu">%/anno</span>
        </label>
        <br />
        <div className="input-stepper">
          <button type="button" onClick={() => setPacApr((prev) => Math.max(0, prev - 0.5))}>
            −
          </button>
          <input
            id="pacApr"
            type="number"
            value={pacApr}
            step={0.5}
            min={0}
            onChange={(e) => setPacApr(Number(e.target.value))}
            placeholder="Rendimento PAC"
          />
          <button type="button" onClick={() => setPacApr((prev) => Math.max(0, prev + 0.5))}>
            +
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Destinazione</th>
              <th>Risparmio IRPEF</th>
              <th>Contributo</th>
              <th>Tasse liquidazione</th>
              <th>Netto PAC</th>
              <th>Netto FPN</th>
              <th>Netto totale</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className={
                fpnAndPacLiquidation >= fpnMaxAndPacLiquidation &&
                fpnAndPacLiquidation >= fpnMinAndPacLiquidation &&
                fpnAndPacLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN + PAC IRPEF</td>
              <td>
                {formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years))}
              </td>
              <td>-</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>
                {formatCurrency(
                  getPacLiquidation(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution))
                )}
              </td>
              <td>
                {formatCurrency(getFundLiquidation(FPN_COST, annualVoluntaryContribution + annualDdlContribution))}
              </td>
              <td>{formatCurrency(fpnAndPacLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnMaxAndPacLiquidation >= fpnAndPacLiquidation &&
                fpnMaxAndPacLiquidation >= fpnMinAndPacLiquidation &&
                fpnMaxAndPacLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN max + PAC min</td>
              <td>
                {formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years))}
              </td>
              <td>
                {formatCurrency(
                  Math.max(totalVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution) * years, 0)
                )}
              </td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>
                {formatCurrency(
                  getPacLiquidation(
                    getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution) +
                      Math.max(annualVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution), 0)
                  )
                )}
              </td>
              <td>
                {formatCurrency(
                  getFundLiquidation(
                    FPN_COST,
                    Math.min(annualVoluntaryContribution + annualDdlContribution, MAX_DEDUCTIBLE)
                  )
                )}
              </td>
              <td>{formatCurrency(fpnMaxAndPacLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnMinAndPacLiquidation >= fpnAndPacLiquidation &&
                fpnMinAndPacLiquidation >= fpnMaxAndPacLiquidation &&
                fpnMinAndPacLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN min + PAC max</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualMinContribution, years))}</td>
              <td>{formatCurrency(Math.max(totalVoluntaryContribution - totalMinVoluntaryContribution, 0))}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>
                {formatCurrency(
                  getPacLiquidation(
                    getFundTaxSaving(ral, annualMinContribution) +
                      Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0)
                  )
                )}
              </td>
              <td>{formatCurrency(getFundLiquidation(FPN_COST, annualMinContribution))}</td>
              <td>{formatCurrency(fpnMinAndPacLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnZeroAndPacLiquidation >= fpnAndPacLiquidation &&
                fpnZeroAndPacLiquidation >= fpnMaxAndPacLiquidation &&
                fpnZeroAndPacLiquidation >= fpnMinAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>PAC</td>
              <td>-</td>
              <td>{formatCurrency(totalVoluntaryContribution)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>{formatCurrency(getPacLiquidation(annualVoluntaryContribution))}</td>
              <td>{formatCurrency(getFundLiquidation(FPN_COST))}</td>
              <td>{formatCurrency(fpnZeroAndPacLiquidation)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tfr;
