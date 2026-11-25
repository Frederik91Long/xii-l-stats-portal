              Weekly franchise records exclude the current
              potentially unfinished week unless the league is complete.
            </p>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Franchise</th>
                    <th>Value</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Highest Team Score</td>
                    <td>
                      {franchiseLink(
                        highestScore?.rosterId
                      )}
                    </td>
                    <td>
                      {highestScore
                        ? `${highestScore.points.toFixed(2)} (W${highestScore.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Lowest Team Score</td>
                    <td>
                      {franchiseLink(
                        lowestScore?.rosterId
                      )}
                    </td>
                    <td>
                      {lowestScore
                        ? `${lowestScore.points.toFixed(2)} (W${lowestScore.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Biggest Victory</td>
                    <td>
                      {franchiseLink(
                        biggestVictory?.winner.rosterId
                      )}
                    </td>
                    <td>
                      {biggestVictory
                        ? `${biggestVictory.margin.toFixed(2)} (W${biggestVictory.winner.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Most Points For</td>
                    <td>
                      {franchiseLink(
                        mostPointsFor?.rosterId
                      )}
                    </td>
                    <td>
                      {mostPointsFor
                        ? mostPointsFor.pointsFor.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Most Points Against</td>
                    <td>
                      {franchiseLink(
                        mostPointsAgainst?.rosterId
                      )}
                    </td>
                    <td>
                      {mostPointsAgainst
                        ? mostPointsAgainst.pointsAgainst.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Best Win Percentage</td>
                    <td>
                      {franchiseLink(
                        bestWinPercentage?.rosterId
                      )}
                    </td>
                    <td>
                      {bestWinPercentage
                        ? `${(bestWinPercentage.winPercentage * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>All-Time XII-L Records</h2>

            <p className="muted">
              All-time records will become available
              when multiple XII-L seasons have been
              imported and stored.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
