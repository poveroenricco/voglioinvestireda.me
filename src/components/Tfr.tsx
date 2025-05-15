import { useState } from "react";
import { formatCurrency, formatPercentage } from "../utils/format";
import { applyTax, applyGain, getAvgTaxRate, getGain } from "../utils/finance";
import { getFundTax, getFundTaxSaving, MAX_DEDUCTIBLE } from "../utils/tfr";
import InputStepper from "./InputStepper";

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
  const [bonds, setBonds] = useState<number>(40);
  const [pacBonds, setPacBonds] = useState<number>(20);

  const INPS_REEVAL_TAX = 0.17;
  const INPS_GROSS_REEVAL = 0.015 + 0.75 * (inflation / 100);
  const INPS_NET_REEVAL = applyTax(INPS_GROSS_REEVAL, INPS_REEVAL_TAX);

  const FPN_COST = 0.00395;
  const FPA_COST = 0.014525;
  const PIP_COST = 0.022625;

  const FUND_GAIN_TAX = 0.2 * (1 - bonds / 100) + 0.125 * (bonds / 100);

  const FPN_NET_GAIN = applyTax(apr / 100 - FPN_COST, FUND_GAIN_TAX);
  const FPA_NET_GAIN = applyTax(apr / 100 - FPA_COST, FUND_GAIN_TAX);
  const PIP_NET_GAIN = applyTax(apr / 100 - PIP_COST, FUND_GAIN_TAX);

  const PAC_TAX = 0.26 * (1 - pacBonds / 100) + 0.125 * (pacBonds / 100);
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

  const fpnLiquidation = getFundLiquidation(FPN_NET_GAIN, annualVoluntaryContribution + annualDdlContribution);
  const fpaLiquidation = getFundLiquidation(FPA_NET_GAIN, annualVoluntaryContribution);
  const pipLiquidation = getFundLiquidation(PIP_NET_GAIN, annualVoluntaryContribution);

  const annualFpnTaxSaving = getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution);

  const totalFpnTaxSaving = getFundTaxSaving(ral, annualVoluntaryContribution + annualDdlContribution, years);
  const totalFpaTaxSaving = getFundTaxSaving(ral, annualVoluntaryContribution, years);
  const totalPipTaxSaving = totalFpaTaxSaving;

  const getFpnGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final = fpnLiquidation + totalFpnTaxSaving;
    return getGain(contribution, final, years);
  };

  const getFpaGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final = fpaLiquidation + totalFpaTaxSaving;
    return getGain(contribution, final, years);
  };

  const getPipGain = () => {
    const contribution = totalTfrContribution + totalVoluntaryContribution;
    const final = pipLiquidation + totalPipTaxSaving;
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

  const fpnAndPacLiquidation = fpnLiquidation + getPacLiquidation(annualFpnTaxSaving);

  const fpnMaxContribution = Math.min(annualVoluntaryContribution + annualDdlContribution, MAX_DEDUCTIBLE);
  const fpnMaxLiquidation = getFundLiquidation(FPN_NET_GAIN, fpnMaxContribution);
  const pacMinContribution = Math.max(annualVoluntaryContribution - (MAX_DEDUCTIBLE - annualDdlContribution), 0);
  const pacMinLiquidation = getPacLiquidation(annualFpnTaxSaving + pacMinContribution);
  const fpnMaxAndPacMinLiquidation = fpnMaxLiquidation + pacMinLiquidation;

  const fpnMinLiquidation = getFundLiquidation(FPN_NET_GAIN, annualMinContribution);
  const pacMaxContribution = Math.max(annualVoluntaryContribution - annualMinVoluntaryContribution, 0);
  const pacMaxLiquidation = getPacLiquidation(getFundTaxSaving(ral, annualMinContribution) + pacMaxContribution);
  const fpnMinAndPacMaxLiquidation = fpnMinLiquidation + pacMaxLiquidation;

  const fpnZeroLiquidation = getFundLiquidation(FPN_NET_GAIN);
  const fpnZeroAndPacLiquidation = fpnZeroLiquidation + getPacLiquidation(annualVoluntaryContribution);

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

      <InputStepper
        id="ral"
        label="RAL"
        mu="€"
        value={ral}
        onDownClick={() => setRal((prev) => Math.max(0, prev - 1000))}
        onUpClick={() => setRal((prev) => Math.max(0, prev + 1000))}
        onUpdate={(value) => setRal(value)}
        step={1000}
        min={0}
        placeholder="28000"
      />
      <InputStepper
        id="apr"
        label="Rendimento lordo fondo"
        mu="%/anno"
        value={apr}
        onDownClick={() => setApr((prev) => Math.max(0, prev - 0.5))}
        onUpClick={() => setApr((prev) => Math.max(0, prev + 0.5))}
        onUpdate={(value) => setApr(value)}
        step={0.5}
        placeholder="3"
      />
      <InputStepper
        id="inflation"
        label="Inflazione"
        mu="%/anno"
        value={inflation}
        onDownClick={() => setInflation((prev) => Math.max(0, prev - 0.5))}
        onUpClick={() => setInflation((prev) => Math.max(0, prev + 0.5))}
        onUpdate={(value) => setInflation(value)}
        step={0.5}
        placeholder="2"
      />

      <h3>Hai dei risparmi mensili?</h3>
      <p>
        Il <strong>contributo volontario</strong> al fondo pensione è una somma aggiuntiva che il lavoratore può versare
        liberamente, anche minima, per aumentare la propria pensione integrativa. Questo contributo è{" "}
        <strong>deducibile fiscalmente fino a {formatCurrency(MAX_DEDUCTIBLE)} l'anno</strong>, riducendo l'IRPEF da
        pagare. Inoltre, in molti fondi <strong>negoziali</strong>, versare anche solo il minimo previsto dal contratto
        attiva automaticamente il <strong>contributo aggiuntivo del datore di lavoro</strong>, un'opportunità
        vantaggiosa che rende l'adesione ancora più conveniente.
      </p>

      <InputStepper
        id="ddlContribution"
        label="Contributo DdL"
        mu="RAL %/anno"
        value={ddlContribution}
        onDownClick={() => setDdlContribution((prev) => Math.max(0, prev - 0.05))}
        onUpClick={() => setDdlContribution((prev) => Math.max(0, prev + 0.05))}
        onUpdate={(value) => setDdlContribution(value)}
        step={0.05}
        min={0}
        placeholder="1,55"
      />
      <InputStepper
        id="minVoluntaryContribution"
        label="Contributo volontario minimo"
        mu="RAL %/anno"
        value={minVoluntaryContribution}
        onDownClick={() => setMinVoluntaryContribution((prev) => Math.max(0, prev - 0.05))}
        onUpClick={() => setMinVoluntaryContribution((prev) => Math.max(0, prev + 0.05))}
        onUpdate={(value) => setMinVoluntaryContribution(value)}
        step={0.05}
        min={0}
        placeholder="0,55"
      />
      <InputStepper
        id="monthlyVoluntaryContribution"
        label="Capacità di risparmio mensile"
        mu="€/mese"
        value={monthlyVoluntaryContribution}
        onDownClick={() => setMonthlyVoluntaryContribution((prev) => Math.max(0, prev - 20))}
        onUpClick={() => setMonthlyVoluntaryContribution((prev) => Math.max(0, prev + 20))}
        onUpdate={(value) => setMonthlyVoluntaryContribution(value)}
        step={minVoluntaryContributionAmount}
        min={0}
        placeholder="120"
      />
      <InputStepper
        id="bonds"
        label="Strumenti a tassazione agevolata"
        mu="%"
        value={bonds}
        onDownClick={() => setBonds((prev) => Math.max(0, prev - 5))}
        onUpClick={() => setBonds((prev) => Math.max(0, prev + 5))}
        onUpdate={(value) => setBonds(value)}
        step={5}
        min={0}
        max={100}
        placeholder="40"
      />

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

      <InputStepper
        id="years"
        label="Anni"
        mu="anni"
        value={years}
        onDownClick={() => setYears((prev) => Math.max(1, prev - 1))}
        onUpClick={() => setYears((prev) => Math.max(1, prev + 1))}
        onUpdate={(value) => setYears(value)}
        step={1}
        min={1}
        max={42}
        placeholder="35"
      />

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
                getInpsLiquidation() >= fpnLiquidation &&
                getInpsLiquidation() >= fpaLiquidation &&
                getInpsLiquidation() >= pipLiquidation
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
                fpnLiquidation >= getInpsLiquidation() &&
                fpnLiquidation >= fpaLiquidation &&
                fpnLiquidation >= pipLiquidation
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
              <td>{formatCurrency(fpnLiquidation)}</td>
              <td>{formatCurrency(totalFpnTaxSaving)}</td>
              <td>{formatCurrency(fpnLiquidation + totalFpnTaxSaving)}</td>
              <td>{formatPercentage(getFpnGain())}</td>
            </tr>
            <tr
              className={
                fpaLiquidation >= getInpsLiquidation() &&
                fpaLiquidation >= fpnLiquidation &&
                fpaLiquidation >= pipLiquidation
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
              <td>{formatCurrency(fpaLiquidation)}</td>
              <td>{formatCurrency(totalFpaTaxSaving)}</td>
              <td>{formatCurrency(fpaLiquidation + totalFpaTaxSaving)}</td>
              <td>{formatPercentage(getFpaGain())}</td>
            </tr>
            <tr
              className={
                pipLiquidation >= getInpsLiquidation() &&
                pipLiquidation >= fpnLiquidation &&
                pipLiquidation >= fpaLiquidation
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
              <td>{formatCurrency(pipLiquidation)}</td>
              <td>{formatCurrency(totalPipTaxSaving)}</td>
              <td>{formatCurrency(pipLiquidation + totalPipTaxSaving)}</td>
              <td>{formatPercentage(getPipGain())}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>E se investi il contributo volontario in un PAC?</h3>

      <InputStepper
        id="pacApr"
        label="Rendimento lordo PAC"
        mu="%/anno"
        value={pacApr}
        onDownClick={() => setPacApr((prev) => Math.max(0, prev - 0.5))}
        onUpClick={() => setPacApr((prev) => Math.max(0, prev + 0.5))}
        onUpdate={(value) => setPacApr(value)}
        step={0.5}
        placeholder="6"
      />
      <InputStepper
        id="pacBonds"
        label="Strumenti a tassazione agevolata"
        mu="%"
        value={pacBonds}
        onDownClick={() => setPacBonds((prev) => Math.max(0, prev - 5))}
        onUpClick={() => setPacBonds((prev) => Math.max(0, prev + 5))}
        onUpdate={(value) => setPacBonds(value)}
        step={5}
        min={0}
        max={100}
        placeholder="20"
      />

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
                fpnAndPacLiquidation >= fpnMaxAndPacMinLiquidation &&
                fpnAndPacLiquidation >= fpnMinAndPacMaxLiquidation &&
                fpnAndPacLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN + PAC IRPEF</td>
              <td>{formatCurrency(annualFpnTaxSaving)}</td>
              <td>-</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>{formatCurrency(getPacLiquidation(annualFpnTaxSaving))}</td>
              <td>{formatCurrency(fpnLiquidation)}</td>
              <td>{formatCurrency(fpnAndPacLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnMaxAndPacMinLiquidation >= fpnAndPacLiquidation &&
                fpnMaxAndPacMinLiquidation >= fpnMinAndPacMaxLiquidation &&
                fpnMaxAndPacMinLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN max + PAC min</td>
              <td>{formatCurrency(annualFpnTaxSaving)}</td>
              <td>{formatCurrency(pacMinContribution)}</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>{formatCurrency(pacMinLiquidation)}</td>
              <td>{formatCurrency(fpnMaxLiquidation)}</td>
              <td>{formatCurrency(fpnMaxAndPacMinLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnMinAndPacMaxLiquidation >= fpnAndPacLiquidation &&
                fpnMinAndPacMaxLiquidation >= fpnMaxAndPacMinLiquidation &&
                fpnMinAndPacMaxLiquidation >= fpnZeroAndPacLiquidation
                  ? "winner"
                  : ""
              }
            >
              <td>FPN min + PAC max</td>
              <td>{formatCurrency(getFundTaxSaving(ral, annualMinContribution))}</td>
              <td>{formatCurrency(pacMaxContribution)}</td>
              <td>{formatPercentage(PAC_GAIN)}</td>
              <td>{formatPercentage(PAC_TAX)}</td>
              <td>{formatCurrency(pacMaxLiquidation)}</td>
              <td>{formatCurrency(fpnMinLiquidation)}</td>
              <td>{formatCurrency(fpnMinAndPacMaxLiquidation)}</td>
            </tr>
            <tr
              className={
                fpnZeroAndPacLiquidation >= fpnAndPacLiquidation &&
                fpnZeroAndPacLiquidation >= fpnMaxAndPacMinLiquidation &&
                fpnZeroAndPacLiquidation >= fpnMinAndPacMaxLiquidation
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
              <td>{formatCurrency(fpnZeroLiquidation)}</td>
              <td>{formatCurrency(fpnZeroAndPacLiquidation)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tfr;
