import { DashboardDirecteur } from "./DashboardDirecteur";

export function AccueilDirecteur({
  ecoleId,
  anneeId,
  anneeActive,
  punitions,
  eleves,
  classes,
  fautes,
  notifs,
}) {
  return (
    <DashboardDirecteur
      ecoleId={ecoleId}
      anneeId={anneeId}
      anneeActive={anneeActive}
      punitions={punitions}
      eleves={eleves}
      classes={classes}
      fautes={fautes}
      notifs={notifs}
    />
  );
}