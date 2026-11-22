"""Cooperative control of the single battle worker."""


class RoundStopped(RuntimeError):
    def __init__(self, snapshot=None):
        super().__init__('Раунд остановлен администратором.')
        self.snapshot = snapshot
        self.team_ids = None
