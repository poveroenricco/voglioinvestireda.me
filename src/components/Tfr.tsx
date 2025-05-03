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

  const FPN_NET_GAIN = applyTax(apr / 100 - FPN_COST, 0.2);
  const FPA_NET_GAIN = applyTax(apr / 100 - FPA_COST, 0.2);
  const PIP_NET_GAIN = applyTax(apr / 100 - PIP_COST, 0.2);

  const PAC_TAX = 0.26;
  const PAC_COST = 0.004;
  const PAC_GAIN = pacApr / 100 - PAC_COST;

  const RAL_TFR = 0.0691;

  const annualTfrContribution = ral * RAL_TFR;
  const totalTfrContribution = annualTfrContribution * years;

  const voluntaryContribution = monthlyVoluntaryContribution > 0;
  const annualVoluntaryContribution = monthlyVoluntaryContribution * 12;
  const totalVoluntaryContribution = annualVoluntaryContribution * years;

  const annualMinVoluntaryContribution = (minVoluntaryContribution / 100) * ral;
  const minVoluntaryContributionAmount = ((minVoluntaryContribution / 100) * ral) / 12;

  const annualDdlContribution = voluntaryContribution ? (ddlContribution / 100) * ral : 0;

  const annualMinContribution = voluntaryContribution ? annualMinVoluntaryContribution + annualDdlContribution : 0;

  const getInpsLiquidation = () => {
    let tfr = 0;

    for (let y = 1; y <= years; y++) {
      tfr = applyGain(tfr, INPS_NET_REEVAL);
      tfr += annualTfrContribution;
    }

    return applyTax(tfr, getAvgTaxRate(ral));
  };

  const getFundLiquidation = (netGain: number, annualContribution = 0) => {
    let capital = 0;
    let contributionToBeTaxed = 0;

    for (let y = 1; y <= years; y++) {
      capital = applyGain(capital, netGain);

      contributionToBeTaxed += annualTfrContribution + Math.min(annualContribution, MAX_DEDUCTIBLE);

      capital += annualTfrContribution + annualContribution;
    }

    return applyTax(contributionToBeTaxed, getFundTax(years)) + (capital - contributionToBeTaxed);
  };

  const getFpnGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final =
      getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) +
      getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years);
    return getGain(contribution, final, years);
  };

  const getFpaGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final =
      getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) +
      getFundTaxSaving(ral, annualVoluntaryContribution, years);
    return getGain(contribution, final, years);
  };

  const getPipGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final =
      getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution) +
      getFundTaxSaving(ral, annualVoluntaryContribution, years);
    return getGain(contribution, final, years);
  };

  const getPacLiquidation = (annualContribution: number) => {
    let totalContribution = 0;
    let pac = 0;

    for (let y = 1; y <= years; y++) {
      pac = applyGain(pac, PAC_GAIN);
      totalContribution += annualContribution;
      pac += annualContribution;
    }

    return totalContribution + applyTax(pac - totalContribution, PAC_TAX);
  };

  const fpnAndPacLiquidation =
    getPacLiquidation(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution)) +
    getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution);

  const fpnMaxAndPacLiquidation =
    getPacLiquidation(
      getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution) +
        Math.max(annualVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution), 0)
    ) + getFundLiquidation(FPN_NET_GAIN, Math.min(annualVoluntaryContribution + annualDdlContribution, MAX_DEDUCTIBLE));

  const fpnMinAndPacLiquidation =
    getPacLiquidation(
      getFundTaxSaving(ral, annualMinContribution) +
        Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0)
    ) + getFundLiquidation(FPN_NET_GAIN, annualMinContribution);

  const fpnZeroAndPacLiquidation = getPacLiquidation(annualVoluntaryContribution) + getFundLiquidation(FPN_NET_GAIN);

  return (
    <div>
      <h2>Sai dove finisce il tuo TFR?</h2>
      <p>
        Il TFR (Trattamento di Fine Rapporto) è una somma che il datore di lavoro (DdL) accantona ogni anno per il
        dipendente, come una sorta di "liquidazione" o risparmio forzato. Coincide a circa il{" "}
        {formatPercentage(RAL_TFR)} della RAL (Retribuzione Annua Lorda). Può restare in azienda (o essere versato
        all'INPS se l'azienda ha più di 50 dipendenti) ed essere liquidato al termine del rapporto di lavoro, oppure
        essere destinato a un fondo pensione per integrare la pensione futura.
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
        PAC viene considerato un costo dello {formatPercentage(PAC_COST)} (TER e imposta di bollo).
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
        <p>
          Massimo importo mensile deducibile:
          <ul>
            <li>FPN: {formatCurrency((MAX_DEDUCTIBLE - (ddlContribution / 100) * ral) / 12)}</li>
            <li>FPA/PIP: {formatCurrency(MAX_DEDUCTIBLE / 12)}</li>
          </ul>
        </p>
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
              <th>TFR annuo</th>
              <th>Contributo volontario annuo</th>
              <th>Contributo DdL annuo</th>
              <th>Rendimento netto annuo</th>
              <th>Tasse su TFR e contributi dedotti alla liquidazione</th>
              <th>Montante netto</th>
              <th>Risparmio IRPEF</th>
              <th>Totale netto</th>
              <th>Rendimento netto finale annualizzato</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className={
                getInpsLiquidation() >=
                  getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) &&
                getInpsLiquidation() >= getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) &&
                getInpsLiquidation() >= getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>INPS/azienda</td>
              <td>{formatCurrency(annualTfrContribution)}</td>
              <td>-</td>
              <td>-</td>
              <td>{formatPercentage(INPS_NET_REEVAL)}</td>
              <td>{formatPercentage(getAvgTaxRate(ral))}</td>
              <td>{formatCurrency(getInpsLiquidation())}</td>
              <td>-</td>
              <td>{formatCurrency(getInpsLiquidation())}</td>
              <td>{formatPercentage(getGain(totalTfrContribution, getInpsLiquidation(), years))}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) >=
                  getInpsLiquidation() &&
                getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) >=
                  getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) &&
                getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) >=
                  getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>FPN</td>
              <td>{formatCurrency(annualTfrContribution)}</td>
              <td>{formatCurrency(annualVoluntaryContribution)}</td>
              <td>{formatCurrency(voluntaryContribution ? annualDdlContribution : 0)}</td>
              <td>{formatPercentage(FPN_NET_GAIN)}</td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>
                {formatCurrency(getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution))}
              </td>
              <td>
                {formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years))}
              </td>
              <td>
                {formatCurrency(
                  getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) +
                    getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years)
                )}
              </td>
              <td>{formatPercentage(getFpnGain())}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) >= getInpsLiquidation() &&
                getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) >=
                  getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) &&
                getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) >=
                  getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>FPA</td>
              <td>{formatCurrency(annualTfrContribution)}</td>
              <td>{formatCurrency(annualVoluntaryContribution)}</td>
              <td>-</td>
              <td>{formatPercentage(FPA_NET_GAIN)}</td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>{formatCurrency(getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution))}</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution, years))}</td>
              <td>
                {formatCurrency(
                  getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution) +
                    getFundTaxSaving(ral, annualVoluntaryContribution, years)
                )}
              </td>
              <td>{formatPercentage(getFpaGain())}</td>
            </tr>
            <tr
              className={
                getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution) >= getInpsLiquidation() &&
                getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution) >=
                  getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution) &&
                getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution) >=
                  getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution)
                  ? "winner"
                  : ""
              }
            >
              <td>PIP</td>
              <td>{formatCurrency(annualTfrContribution)}</td>
              <td>{formatCurrency(annualVoluntaryContribution)}</td>
              <td>-</td>
              <td>{formatPercentage(PIP_NET_GAIN)}</td>
              <td>{formatPercentage(getFundTax(years))}</td>
              <td>{formatCurrency(getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution))}</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution, years))}</td>
              <td>
                {formatCurrency(
                  getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution) +
                    getFundTaxSaving(ral, annualVoluntaryContribution, years)
                )}
              </td>
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
              <th>Risparmio IRPEF annuo</th>
              <th>Contributo annuo</th>
              <th>Rendimento netto annuo</th>
              <th>Tasse sulla plusvalenza</th>
              <th>Netto PAC</th>
              <th>Montante netto FPN</th>
              <th>Totale netto</th>
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
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution))}</td>
              <td>-</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>
                {formatCurrency(
                  getPacLiquidation(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution))
                )}
              </td>
              <td>
                {formatCurrency(getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution))}
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
              <td>{formatCurrency(getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution))}</td>
              <td>
                {formatCurrency(Math.max(annualVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution), 0))}
              </td>
              <td>{formatPercentage(PAC_GAIN)}</td>
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
              <td>{formatCurrency(getFundTaxSaving(ral, annualMinContribution))}</td>
              <td>{formatCurrency(Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0))}</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>
                {formatCurrency(
                  getPacLiquidation(
                    getFundTaxSaving(ral, annualMinContribution) +
                      Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0)
                  )
                )}
              </td>
              <td>{formatCurrency(getFundLiquidation(FPN_NET_GAIN, annualMinContribution))}</td>
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
              <td>{formatCurrency(annualVoluntaryContribution)}</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>{formatCurrency(getPacLiquidation(annualVoluntaryContribution))}</td>
              <td>{formatCurrency(getFundLiquidation(FPN_NET_GAIN))}</td>
              <td>{formatCurrency(fpnZeroAndPacLiquidation)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tfr;
