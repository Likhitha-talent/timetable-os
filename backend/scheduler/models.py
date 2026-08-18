from django.db import models
from django.contrib.auth.models import User


class Schedule(models.Model):
    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active"),
        ("completed", "Completed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="planning",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("user", "date")

    def __str__(self):
        return f"{self.user.username} — {self.date} ({self.status})"

    @property
    def total_planned_minutes(self):
        return sum(task.duration_minutes for task in self.tasks.all())


class Task(models.Model):
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"),
        ("active", "Active"),
        ("done", "Done"),
        ("skipped", "Skipped"),
    ]

    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField()
    order = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="upcoming",
    )
    priority = models.PositiveSmallIntegerField(default=2)

    actual_minutes_spent = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}m) — {self.status}"